const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const connectDB = require('./config/database');
const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');

//세션, 패스포트
const session = require('express-session');
const passport = require('./config/passport');



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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/auth', authRouter);
app.use('/user', userRouter);
app.get('/', (req, res) => {
    res.render('index');
});

app.use((err, req, res, next) => {
    console.error('ERROR:', err);

    res.status(err.status || 500).send(err.message || '서버 에러');
});


app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});