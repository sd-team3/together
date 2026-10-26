const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const service = require('../../services/crew/attendanceService');
const Activity = require('../../models/crewActivity');
const User = require('../../models/User');
const { CONSTANTS } = require('../../config/constants');
const router = express.Router({ mergeParams: true });

router.use(require('../../middlewares/attendanceSession'));
router.use(async (req, res, next) => {
    try {
        Object.assign(res.locals, await service.access(req.params.crewId, req.user._id));
        next();
    } catch (error) {
        next(error);
    }
});
router.use((req, res, next) => {
    if (
        req.method === 'POST' &&
        (!req.is('application/json') ||
            req.get('X-Attendance-CSRF') !== req.session.attendanceCsrf ||
            req.get('Sec-Fetch-Site') === 'cross-site')
    )
        return res.status(403).json({ message: '페이지를 새로고침한 후 다시 시도해주세요.' });
    next();
});
router.get('/', async (req, res, next) => {
    try {
        const month = service.monthInfo(req.query.month);
        const activities = await Activity.find({
            crewId: req.params.crewId,
            crewModel: 'regular',
            startTime: { $gte: month.start, $lt: month.end }
        })
            .select('title startTime')
            .sort({ startTime: 1 })
            .lean();
        const dates = {};
        for (const activity of activities) {
            const key = service.dateKey(activity.startTime);
            (dates[key] ||= []).push(activity);
        }
        res.render('crew/attendance', {
            mode: 'calendar',
            month,
            dates,
            today: service.dateKey(new Date())
        });
    } catch (error) {
        next(error);
    }
});
router.get('/day/:date', async (req, res, next) => {
    try {
        const date = service.validDay(req.params.date);
        const start = new Date(`${date}T00:00:00+09:00`);
        const activities = await Activity.find({
            crewId: req.params.crewId,
            crewModel: 'regular',
            startTime: { $gte: start, $lt: new Date(start.getTime() + 86400000) }
        })
            .sort({ startTime: 1 })
            .lean();
        const activity = req.query.activity
            ? activities.find((item) => String(item._id) === req.query.activity)
            : activities[0];
        if (req.query.activity && !activity)
            throw Object.assign(new Error('이 날짜의 활동이 아닙니다.'), { status: 404 });
        const memberIds = activity ? service.participants(activity) : [];
        const users = await User.find({ _id: { $in: memberIds } })
            .select('name')
            .lean();
        const names = new Map(users.map((user) => [String(user._id), user.name]));
        const attendedIds = new Set((activity?.attender || []).map(String));
        const members = memberIds.map((id) => ({
            id,
            name: names.get(id) || '탈퇴한 멤버',
            attended: attendedIds.has(id)
        }));
        res.render('crew/attendance', {
            mode: 'day',
            date,
            activities,
            activity,
            members,
            canIssue: activity && service.isOpen(activity)
        });
    } catch (error) {
        next(error);
    }
});
router.post('/activity/:activityId/qr', async (req, res, next) => {
    try {
        const { token, expiresAt } = await service.issueQr(
            req.params.crewId,
            req.params.activityId,
            req.user._id
        );
        const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const url = new URL(
            `/regular/${req.params.crewId}/attendance/activity/${req.params.activityId}/check`,
            base
        );
        url.hash = `token=${token}`;
        const image = await QRCode.toDataURL(url.href, { width: 280, margin: 2 });
        res.json({ image, expiresAt });
    } catch (error) {
        next(error);
    }
});
router.get('/activity/:activityId/check', async (req, res, next) => {
    try {
        const activity = await service.activityFor(req.params.crewId, req.params.activityId);
        res.render('crew/attendance', { mode: 'check', activity });
    } catch (error) {
        next(error);
    }
});
router.post('/activity/:activityId/check', async (req, res, next) => {
    try {
        res.json(
            await service.checkIn(
                req.params.crewId,
                req.params.activityId,
                req.user._id,
                req.body?.token
            )
        );
    } catch (error) {
        next(error);
    }
});
router.use((error, req, res, next) => {
    const status = error.status || 500;
    const message =
        status === 500 ? '출석부를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : error.message;
    if (req.method === 'POST') return res.status(status).json({ message });
    res.status(status).render('crew/attendance', { mode: 'error', message });
});
module.exports = router;
