const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('01_home');
});
app.get('/map', (req, res) => {
    res.render('02_map');
});
app.get('/map-create', (req, res) => {
    res.render('03_map_create');
});
app.get('/regular', (req, res) => {
    res.render('04_regular');
});
app.get('/regular-create', (req, res) => {
    res.render('05_regular_create');
});
app.get('/notifications', (req, res) => {
    res.render('06_notifications');
});
app.get('/trade', (req, res) => {
    res.render('07_trade');
});

app.get('/ep', (req, res) => {
    res.render('ep');
});

app.get('/vp', (req, res) => {
    res.render('vp');
});


app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});