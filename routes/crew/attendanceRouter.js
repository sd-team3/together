const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../../controllers/crew/attendanceController');
const attendanceSession = require('../../middlewares/attendanceSession');
const attendanceMiddleware = require('../../middlewares/attendanceMiddleware');
const { attendanceRequestValidation } = require('../../middlewares/requestValidation');

router.use(attendanceSession);
router.use(attendanceMiddleware.regularAccess);
router.use(attendanceRequestValidation);

router.get('/', attendanceMiddleware.validateCalendar, controller.getCalendar);
router.get('/day/:date', attendanceMiddleware.validateDay, controller.getDay);
router.post('/activity/:activityId/qr', controller.postQr);
router.get('/activity/:activityId/check', controller.getCheck);
router.post('/activity/:activityId/check', controller.postCheck);
router.post('/activity/:activityId/host-check', controller.postHostCheck);

router.use(attendanceMiddleware.regularError);

module.exports = router;
