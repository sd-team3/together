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
const session = require('express-session');

const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');
const regularRouter = require('./routes/crew/regularRouter');
const notiRouter = require('./routes/notiRouter');
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


app.get('/', (req, res) => {
    res.render('index');
});

app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/regular', regularRouter);
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