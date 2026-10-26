const express = require('express');
const QRCode = require('qrcode');
const User = require('../../models/User');
const service = require('../../services/crew/instantAttendanceService');
const router = express.Router({ mergeParams: true });
router.use(require('../../middlewares/attendanceSession'));
router.use(async (req, res, next) => {
    try {
        Object.assign(res.locals, await service.access(req.params.crewId, req.user._id));
        res.locals.instantAttendance = true;
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
    ) {
        return res.status(403).json({ message: '페이지를 새로고침한 후 다시 시도해주세요.' });
    }
    next();
});
async function membersFor(crew) {
    const members = service.roster(crew);
    const users = await User.find({ _id: { $in: members.map((m) => m.id) } })
        .select('name')
        .lean();
    const names = new Map(users.map((u) => [String(u._id), u.name]));
    return members.map((m) => ({ ...m, name: names.get(m.id) || '탈퇴한 멤버' }));
}
router.get('/', async (req, res, next) => {
    try {
        const crew = res.locals.crew;
        res.render('crew/attendance', {
            mode: 'day',
            date: service.dateKey(crew.meetAt),
            activity: service.activity(crew),
            activities: [],
            members: await membersFor(crew),
            canIssue: service.isOpen(crew)
        });
    } catch (error) {
        next(error);
    }
});
router.get('/status', async (req, res, next) => {
    try {
        const members = await membersFor(res.locals.crew);
        res.render('crew/partials/attendance-roster', { members }, (error, html) => {
            if (error) return next(error);
            res.json({ html, canIssue: service.isOpen(res.locals.crew) });
        });
    } catch (error) {
        next(error);
    }
});
router.post('/qr', async (req, res, next) => {
    try {
        const { token, expiresAt } = await service.issueQr(req.params.crewId, req.user._id);
        const url = new URL(
            `/instant/${req.params.crewId}/attendance/check`,
            process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`
        );
        url.hash = `token=${token}`;
        res.json({ image: await QRCode.toDataURL(url.href, { width: 280, margin: 2 }), expiresAt });
    } catch (error) {
        next(error);
    }
});
router.get('/check', (req, res) => {
    res.render('crew/attendance', { mode: 'check', activity: service.activity(res.locals.crew) });
});
router.post('/check', async (req, res, next) => {
    try {
        res.json(await service.checkIn(req.params.crewId, req.user._id, req.body?.token));
    } catch (error) {
        next(error);
    }
});
router.use((error, req, res, next) => {
    const status = error.status || 500;
    const message =
        status === 500 ? '출석부를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : error.message;
    if (req.method === 'POST' || req.path === '/status')
        return res.status(status).json({ message });
    res.status(status).render('crew/attendance', { mode: 'error', message });
});
module.exports = router;
