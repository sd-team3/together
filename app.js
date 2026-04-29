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

app.get('/kakao-map-js-key', (req, res) => {
    res.json({ key: process.env.KAKAO_JS_KEY });
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});