// controllers/crew/instantController.js
const { CONSTANTS } = require('../../config/constants');
const instantService = require('../../services/crew/instantService');
const applicationService = require("../../services/crew/applicationService");

const getInstant = async (req, res) => {
    try {
        const filter = {
            sport: req.query.sport ? req.query.sport.split(',') : null,
            state: req.query.state || null,
            city: req.query.city || null,
            isAutoAccept: req.query.isAutoAccept || null,
            isRecruiting: req.query.isRecruiting || null
        };

        const { crews, crewsJson, myCrewIds, currentUserId } =
            await instantService.getInstantPageData(filter, req.isAuthenticated() ? req.user : null);

        const pageData = {
            crews: crewsJson,
            isLoggedIn: req.isAuthenticated(),
            myCrewIds,
            currentUserId
        };

        res.render('crew/instantCrew', { CONSTANTS, crews, pageData });
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
};

const getInstantCreate = (req, res) => {
    res.render('crew/instantCreate', { CONSTANTS: CONSTANTS });
};

const postInstantCreate = async (req, res) => {
    try {
        const host = req.user._id;
        const data = req.body;

        data.isAutoAccept = (data.isAutoAccept === 'enable');

        const result = await instantService.createInstantCrew(data, host);

        if (result.success) {
            return res.redirect('/');
        } else {
            return res.status(400).send();
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('서버 오류가 발생했습니다.');
    }
};

const getInstantDetail = async (req, res, next) => {
    try {
        const crew = await instantService.getCrewDetail(req.params.instantId);
        if (!crew) return res.status(404).send('모임을 찾을 수 없습니다');

        if (!req.isAuthenticated()) {
            return res.render('crew/instantMyCrewDetail', { crew, CONSTANTS, isHost: false, isMember: false, currentUserId: null });
        }
        const userId = req.user._id.toString();
        const isHost = crew.host._id.toString() === userId;
        const isMember = crew.member.memberList.some(m => m.user?._id?.toString() === userId);
        res.render('crew/instantMyCrewDetail', { crew, CONSTANTS, isHost, isMember, currentUserId: userId });
    } catch (error) {
        next(error);
    }
};

const deleteInstantCrew = async (req, res, next) => {
    try {
        const crewId = req.params.instantId;
        const userId = req.user._id;
        const result = await instantService.deleteInstantCrew(crewId, userId);

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message });
        }
        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const kickMember = async (req, res, next) => {
    try {
        const { instantId, userId } = req.params;
        const hostId = req.user._id;
        const result = await instantService.kickMember(instantId, hostId, userId);

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message });
        }
        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const getInstantDetailApi = async (req, res, next) => {
    try {
        if (!req.isAuthenticated()) return res.status(401).json({ success: false });

        const crew = await instantService.getCrewDetail(req.params.instantId);
        if (!crew) return res.status(404).json({ success: false });

        const userId = req.user._id.toString();
        const isHost = crew.host._id.toString() === userId;
        const isMember = crew.member.memberList.some(m => m.user?._id?.toString() === userId);

        if (!isHost && !isMember) return res.status(403).json({ success: false });

        const pendingApps = await applicationService.findPendingAppsByCrewId(req.params.instantId);

        res.json({ success: true, crew, isHost, pendingApps });
    } catch (error) {
        next(error);
    }
};

const setNoshow = async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ success: false });
    try {
        const { instantId, userId } = req.params;
        const hostId = req.user._id;
        const result = await instantService.setNoshow(instantId, hostId, userId);

        if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getInstantCreate,
    postInstantCreate,
    getInstant,
    getInstantDetail,
    getInstantDetailApi,
    deleteInstantCrew,
    kickMember,
    setNoshow
};