const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const connectDB = require('./config/database');
const passport = require('passport');
const session = require('express-session');
const http = require('http'); // node.js 자체 모듈-, http 통해 서버 만들기
const {Server} = require('socket.io'); // 웹소켓 올리는 서버


const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');
const {notFoundHandler, errorHandler} = require('./middlewares/errorMiddleware');
// 웹소켓
const chatRouter = require('./routes/chatRouter');
const {initSocket} = require('./config/socket');
const httpServer = http.createServer(app);
const io = new Server(httpServer);

connectDB();

app.use(express.json());
app.use(express.urlencoded({extended : true}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// 전역 변수 추가
app.use((req, res, next) => {
    res.locals.user = req.user || null; // 모든 ejs에서 user 변수 사용 가능
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('index');
});

app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/chat', chatRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.use((err, req, res, next) => {
    console.error('ERROR:', err);

    res.status(err.status || 500).send(err.message || '서버 에러');
});

initSocket(io);

httpServer.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});