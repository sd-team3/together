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

app.use('/home', (req, res) => {
    res.render('01_home');
})

app.use('/map', (req, res) => {
    res.render('02_map');
})

app.use('/map-create', (req, res) => {
    res.render('03_map_create');
})

app.use('/regular', (req, res) => {
    res.render('04_regular');
})

app.use('/regular-create', (req, res) => {
    res.render('05_regular_create');
})

app.use('/notifications', (req, res) => {
    res.render('06_notifications');
})

app.use('/trade', (req, res) => {
    res.render('07_trade');
})

app.use('/trade-sell', (req, res) => {
    res.render('08_trade_sell');
})

app.use('/community', (req, res) => {
    res.render('09_community');
})

app.use('/ranking', (req, res) => {
    res.render('10_ranking');
})

app.use('/mypage', (req, res) => {
    res.render('11_mypage');
})

app.use('/chat', (req, res) => {
    res.render('12_chat');
})

app.use('/edit-profile', (req, res) => {
    res.render('13_edit_profile');
})

app.use('/verify-password', (req, res) => {
    res.render('14_verify_password');
})

app.use('/settings', (req, res) => {
    res.render('15_settings');
})

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});