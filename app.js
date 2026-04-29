const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const connectDB = require('./config/database');
const passport = require('passport');
const session = require('express-session');


const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');
const {notFoundHandler, errorHandler} = require('./middlewares/errorMiddleware');

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


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/user', userRouter);
app.use('/auth', authRouter);

app.use(notFoundHandler);
app.use(errorHandler);


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