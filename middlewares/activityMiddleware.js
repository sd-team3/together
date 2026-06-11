const { authenticate } = require('passport');
const crewService = require('../services/crew/crewService');

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

    if (!req.crewModel?.modelName || !req.params.crewId) {
        return res.status(500).json({ message: "크루 정보가 유효하지 않습니다." });
    }

    const title = `${startTime.split('T')[0]} / ${startTime.split('T')[1]}-${endTime.split('T')[1]} : ${gameType}`;

    req.activityData = {
        crewModel: req.crewModel.modelName,
        crewId: req.params.crewId,
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

module.exports = {
    activityCreateMiddleware
};