const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const connectDB = require('./config/database');
const passport = require('passport');
require('./config/passport');  
const session = require('express-session');

const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');
const regularRouter = require('./routes/crew/regularRouter');
const instantRouter = require('./routes/crew/instantRouter');
const notiRouter = require('./routes/notiRouter');
const indexRouter = require('./routes/indexRouter.js');
const {notFoundHandler, errorHandler} = require('./middlewares/errorMiddleware');
// 웹소켓
const chatRouter = require('./routes/chatRouter');
const {initSocket} = require('./config/socket');
const httpServer = http.createServer(app);
const io = new Server(httpServer);


// const RegularCrew = require('./models/regularCrew.js');

// async function addScheduleToExistingCrew() {
//     try {
//         // 1️⃣ 일정을 추가하고 싶은 대상 크루를 ID로 조회합니다.
//         const crewId = "6655f1e2b3c4d5e6f7a8b9c0";
//         const crew = await RegularCrew.findById(crewId);

//         if (crew) {
//             // 2️⃣ 크루의 schedule 배열 필드에 새로운 일정 객체를 push 합니다.
//             crew.schedule.push({
//                 "title": "",
//                 "date": new Date("2026-06-14T10:30:00.000Z"),
//                 "address": {
//                     "state": crew.address.state, // 기존 크루 주소를 그대로 활용하거나 새로 입력
//                     "city": crew.address.city,
//                     "detail": "영통종합공원 축구장"
//                 },
//                 "participants": [ '6a18ff3d99c14cf2d4ea1f28', '6a18ffde99c14cf2d4ea1f2a' ], // 기본 참여자로 방장 ID 주입
//                 "status": "종료"
//             });

//             // 3️⃣ 변경된 데이터를 DB에 최종 저장(Update) 합니다.
//             await crew.save();
//             console.log('✅ [성공] 기존 크루의 schedule 배열에 새로운 일정이 추가되었습니다!');
            
//             // 확인용 로그 출력
//             console.log('📋 업데이트 후 일정 개수:', crew.schedule.length, '개');
//         } else {
//             console.log('❌ 해당 ID를 가진 크루 데이터를 찾을 수 없습니다.');
//         }

//     } catch (error) {
//         console.error('❌ 일정 추가 작업 중 에러 발생:', error);
//     }
// }



connectDB();

// insertDummyCrewWithSchedule();

app.use(express.json());
app.use(express.urlencoded({extended : true}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
//소셜
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});


app.set('io', io);
initSocket(io);


app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/config', express.static(path.join(__dirname, 'config')));
app.get('/kakao-map-js-key', (req, res) => {
    res.json({ key: process.env.KAKAO_JS_KEY});
})

//index
app.use('/', indexRouter);


app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/regular', regularRouter);
app.use('/instant', instantRouter);
app.use('/noti', notiRouter);

app.use('/chat', chatRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.use((err, req, res, next) => {
    console.error('ERROR:', err);

    res.status(err.status || 500).send(err.message || '서버 에러');
});

httpServer.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});