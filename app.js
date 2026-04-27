const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const mapRouter = require('./routers/mapRouter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('test/test', { API_KEY : process.env.API_KEY });
});

app.use(mapRouter);

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});