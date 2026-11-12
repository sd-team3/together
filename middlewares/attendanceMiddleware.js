const attendanceUtils = require('../utils/attendanceUtils');
const regularService = require('../services/crew/attendanceService');
const instantService = require('../services/crew/instantAttendanceService');

const regularAccess = async (req, res, next) => {
    try {
        Object.assign(res.locals, await regularService.access(req.params.crewId, req.user._id));
        next();
    } catch (error) {
        next(error);
    }
};
const instantAccess = async (req, res, next) => {
    try {
        Object.assign(res.locals, await instantService.access(req.params.crewId, req.user._id));
        res.locals.instantAttendance = true;
        next();
    } catch (error) {
        next(error);
    }
};
function respondError(error, req, res, jsonResponse) {
    const status = error.status || 500;
    const message = status === 500
        ? '출석부를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : error.message;
    if (jsonResponse) return res.status(status).json({ message });
    res.status(status).render('crew/attendance', { mode: 'error', message });
}
const regularError = (error, req, res, next) => {
    respondError(error, req, res, req.method === 'POST');
};
const instantError = (error, req, res, next) => {
    respondError(error, req, res, req.method === 'POST' || req.path === '/status');
};
const validateCalendar = (req, res, next) => {
    try {
        res.locals.attendanceMonth = attendanceUtils.monthInfo(req.query.month);
        next();
    } catch (error) {
        next(error);
    }
};
const validateDay = (req, res, next) => {
    try {
        res.locals.attendanceDate = attendanceUtils.validDay(req.params.date);
        next();
    } catch (error) {
        next(error);
    }
};
module.exports = { validateCalendar, validateDay, regularAccess, instantAccess, regularError, instantError };
