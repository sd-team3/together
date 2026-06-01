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

const homeService = require('../services/indexService');

router.get('/api/regular-meetings', async (req, res, next) => {
  try {
    const sport = req.query.sport || ''; // 'soccer', 'baseball' 등
    const meetings = await homeService.getRegularMeetings(sport);
    res.json({ ok: true, meetings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;