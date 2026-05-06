const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
const { initSocket } = require('./config/socket');

const httpServer = http.createServer(app);
const io = new Server(httpServer);


app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/kakao-map-js-key', (req, res) => {
    res.json({ key: process.env.KAKAO_JS_KEY });
});

app.use('/auth', authRouter);
app.use('/user', userRouter);
app.get('/', (req, res) => {
    res.render('index');
});

app.listen(PORT, () => {
initSocket(io);

httpServer.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});