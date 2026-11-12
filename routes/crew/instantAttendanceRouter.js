const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../../controllers/crew/instantAttendanceController');
const attendanceSession = require('../../middlewares/attendanceSession');
const attendanceMiddleware = require('../../middlewares/attendanceMiddleware');
const { attendanceRequestValidation } = require('../../middlewares/requestValidation');

router.use(attendanceSession);
router.use(attendanceMiddleware.instantAccess);
router.use(attendanceRequestValidation);

router.get('/', controller.getAttendance);
router.get('/status', controller.getStatus);
router.post('/qr', controller.postQr);
router.get('/check', controller.getCheck);
router.post('/check', controller.postCheck);
router.post('/host-check', controller.postHostCheck);

router.use(attendanceMiddleware.instantError);
module.exports = router;
