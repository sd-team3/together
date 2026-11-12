const service = require('../../services/crew/attendanceService');
const attendanceUtils = require('../../utils/attendanceUtils');

const getCalendar = async (req, res, next) => {
    try {
        const month = res.locals.attendanceMonth;
        const activities = await service.findActivities(req.params.crewId, month.start, month.end);
        const data = {
            month,
            dates: attendanceUtils.groupActivitiesByDate(activities),
            today: attendanceUtils.dateKey(new Date())
        };
        res.render('crew/attendance', { mode: 'calendar', ...data });
    } catch (error) {
        next(error);
    }
};

const getDay = async (req, res, next) => {
    try {
        const date = res.locals.attendanceDate;
        const start = new Date(`${date}T00:00:00+09:00`);
        const end = new Date(start.getTime() + 86400000);
        const activities = await service.findActivities(req.params.crewId, start, end);
        const activity = attendanceUtils.selectActivity(activities, req.query.activity);
        const roster = attendanceUtils.regularRoster(activity);
        const users = await service.findMemberNames(roster.map(member => member.id));
        const data = {
            date, activities, activity,
            members: attendanceUtils.addMemberNames(roster, users),
            canIssue: activity && attendanceUtils.isOpen(activity)
        };
        res.render('crew/attendance', { mode: 'day', ...data });
    } catch (error) {
        next(error);
    }
};

const postQr = async (req, res, next) => {
    try {
        const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const { crewId, activityId } = req.params;
        const { token, expiresAt } = await service.issueQr(crewId, activityId, req.user._id);
        const path = `/regular/${crewId}/attendance/activity/${activityId}/check`;
        const image = await attendanceUtils.createQrImage(path, base, token);
        res.json({ image, expiresAt });
    } catch (error) {
        next(error);
    }
};

const getCheck = async (req, res, next) => {
    try {
        const activity = await service.activityFor(req.params.crewId, req.params.activityId);
        res.render('crew/attendance', { mode: 'check', activity });
    } catch (error) {
        next(error);
    }
};

const postCheck = async (req, res, next) => {
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
};

const postHostCheck = async (req, res, next) => {
    try {
        res.json(await service.checkInAsHost(
            req.params.crewId, req.params.activityId, req.user._id, req.body
        ));
    } catch (error) {
        next(error);
    }
};

module.exports = { getCalendar, getDay, postQr, getCheck, postCheck, postHostCheck };
