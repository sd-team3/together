const { authenticate } = require('passport');
const crewService = require('../services/crew/crewService');
const activityService = require('../services/crew/activityService');

const activityCreateMiddleware = (req, res, next) => {
    const { content, startTime, endTime, location, gameType, capacity } = req.body;
    const field = { content, startTime, endTime, gameType, capacity };
    
    if (Object.values(field).some(val => val === null || val === undefined || val === "")) {
        return res.status(400).json({ message: "입력란을 모두 채워주세요." });
    }

    const { state, city, detail, lat, lng } = location || {};
    if (!state || !city || !detail || lat === undefined || lng === undefined) {
        return res.status(400).json({ message: "장소 정보가 올바르지 않습니다." });
    }

    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        return res.status(400).json({ message: "크루 활동은 24시간 이전에 개설해야 합니다." });
    }

    if (start >= end) {
        return res.status(400).json({ message: "잘못된 시간 입력입니다." });
    }

    const capacity_ = Number(capacity)

    if (isNaN(capacity_) || capacity_ <= 1) {
        return res.status(400).json({ message: "정원은 1 이상이어야 합니다." });
    }

    if (!req.crewModel?.modelName || !req.crew._id) {
        return res.status(500).json({ message: "크루 정보가 유효하지 않습니다." });
    }

    const title = `${startTime.split('T')[0]} / ${startTime.split('T')[1]}-${endTime.split('T')[1]} : ${gameType}`;

    req.activityData = {
        crewModel: req.crewModel.modelName,
        crewId: req.crew._id,
        title: title,
        content: content,
        startTime: startTime,
        endTime: endTime,
        location: {
            state,
            city,
            detail,
            lat: Number(lat),
            lng: Number(lng)
        },
        gameType: gameType,
        capacity: capacity_
    };

    next();
};

const isActExist = async (req, res, next) => {
    try {
        const act = await activityService.findActById(req.params.actId);
        if(!act) return res.status(404).json({ message: '활동을 찾을 수 없습니다.' });
        req.params.crewId = act.crewId.toString();
        req.activity = act;
        next();
    } catch (error) {
        console.error('isActExist 오류:', error);
        return res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
    }
};

const progressMiddleware = async (req, res, next) => {
    const { status } = req.params;

    const allowedStatuses = ['recruit', 'deadline', 'active', 'end', 'cancel'];    
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: '올바르지 않은 상태 변경 요청입니다.' });
    
    const statusMap = {
        'recruit': '모집',
        'deadline': '마감',
        'active': '활동',
        'end': '종료',
        'cancel': '취소'
    };
    const koreanStatus = statusMap[status];
    req.koreanStatus = koreanStatus;
};

module.exports = {
    activityCreateMiddleware,
    isActExist,
    progressMiddleware
};