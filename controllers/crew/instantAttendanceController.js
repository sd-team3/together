const service = require('../../services/crew/instantAttendanceService');
const attendanceUtils = require('../../utils/attendanceUtils');

const getAttendance = async (req, res, next) => {
    try {
        const crew = res.locals.crew;
        const roster = attendanceUtils.roster(crew);
        const users = await service.findMemberNames(roster.map(member => member.id));
        const data = {
            date: attendanceUtils.dateKey(crew.meetAt),
            activity: attendanceUtils.instantActivity(crew),
            activities: [],
            members: attendanceUtils.addMemberNames(roster, users),
            canIssue: attendanceUtils.instantIsOpen(crew)
        };
        res.render('crew/attendance', { mode: 'day', ...data });
    } catch (error) {
        next(error);
    }
};

const getStatus = async (req, res, next) => {
    try {
        const roster = attendanceUtils.roster(res.locals.crew);
        const users = await service.findMemberNames(roster.map(member => member.id));
        const members = attendanceUtils.addMemberNames(roster, users);
        res.render('crew/partials/attendance-roster', { members }, (error, html) => {
            if (error) return next(error);
            res.json({ html, canIssue: attendanceUtils.instantIsOpen(res.locals.crew) });
        });
    } catch (error) {
        next(error);
    }
};

const postQr = async (req, res, next) => {
    try {
        const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const { crewId } = req.params;
        const { token, expiresAt } = await service.issueQr(crewId, req.user._id);
        const path = `/instant/${crewId}/attendance/check`;
        const image = await attendanceUtils.createQrImage(path, base, token);
        res.json({ image, expiresAt });
    } catch (error) {
        next(error);
    }
};

const getCheck = (req, res) => {
    res.render('crew/attendance', { mode: 'check', activity: attendanceUtils.instantActivity(res.locals.crew) });
};

const postCheck = async (req, res, next) => {
    try {
        res.json(await service.checkIn(req.params.crewId, req.user._id, req.body?.token));
    } catch (error) {
        next(error);
    }
};

const postHostCheck = async (req, res, next) => {
    try {
        res.json(await service.checkInAsHost(req.params.crewId, req.user._id, req.body));
    } catch (error) {
        next(error);
    }
};

module.exports = { getAttendance, getStatus, postQr, getCheck, postCheck, postHostCheck };
