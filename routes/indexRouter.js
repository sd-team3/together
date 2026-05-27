const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

const activeUsers = new Set();

router.use((req, res, next) => {
    if (req.user) activeUsers.add(req.user._id.toString());
    req.app.locals.activeUserCount = activeUsers.size;
    next();
});

router.get('/', indexController.getHome);

module.exports = router;