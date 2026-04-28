const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;
const connectDB = require('./config/database');
const userRouter = require('./routes/userRouter');


connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended : true}));


app.use('/user', userRouter);
app.get('/', (req, res) => {
    res.render('index');
});


app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});