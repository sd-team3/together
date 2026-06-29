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


// 정기모임-api
router.get('/api/regular-meetings', indexController.getRegularMeetingsApi);

module.exports = router;