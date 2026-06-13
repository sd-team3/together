const { authenticate } = require('passport');
const applicationService = require('../services/crew/applicationService');
const crewService = require('../services/crew/crewService');

const isHost = async (req, res, next)=>{
    try {
        if (req.isAuthenticated()) {
            const hostId = req.crew.host;
            if(!hostId) return res.status(403).json({ message: "존재하지 않는 크루입니다." });
            return hostId.equals(req.user._id) ? next() : res.status(403).json({ message: "권한이 없습니다." });
        }
        return res.redirect('/user/login');
    } catch (error) {
        return res.status(500).json({ message: "DB오류" });
    }
};

const isMember = async (req, res, next)=>{
    try {
        if (req.isAuthenticated()) {
            const result = await crewService.userInCrew(req.crewModel, req.params.crewId, req.user._id);
            return result ? next() : res.status(403).json({ message: "권한이 없습니다." });
        }
    } catch (error) {
        return res.status(500).json({ message: "DB오류" });
    }
};

const isCrewExist = async (req, res, next)=>{
    try {
        const crew = await req.crewModel.findById(req.params.crewId);
        if(!crew)  return res.status(404).json({ message: "존재하지 않는 크루입니다." });
        req.crew = crew;
        next();
    } catch (error) {
        return res.status(500).json({ message: "DB오류" });
    }
};

const loginValidation = async (req, res, next)=>{
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/user/login');
};

const regularCreateMiddleware = (req, res, next)=>{
    const host = req.user._id;
    let data = req.body;
    let profileFile = req.file;
    
    if (!data.day) {
        data.day = ['none']; 
    } else if (!Array.isArray(data.day)) {
        data.day = [data.day];
    }
    
    if (!data.ageRange) {
        data.ageRange = ['all']; 
    } else if (!Array.isArray(data.ageRange)) {
        data.ageRange = [data.ageRange];
    }
    
    data.isAutoAccept = (data.isAutoAccept === 'enable');

    req.crewData = { data, profileFile, host };
    next();
};

const applicationValidation = async (req, res, next)=>{
    try {
        const crew = req.crew;
        console.log(crew);
        const ageGroup = req.user.age >= 60 ? '60+' : `${Math.floor(req.user.age / 10) * 10}s`;
        const isMember = await crewService.userInCrew(req.crewModel, req.params.crewId, req.user._id);

        if (isMember) return res.status(400).json({ message: "이미 가입되어 있습니다." });
        if (crew.member.memberList.length >= crew.member.capacity) return res.status(400).json({ message: "최대 인원에 도달한 크루입니다." });
        if (crew.ageRange && !crew.ageRange.includes('all') && !crew.ageRange.includes(ageGroup)) {
            return res.status(404).json({ message: "현재 연령대는 가입 불가한 크루입니다." });
        }

        const notiData = crew.isAutoAccept ?
        {
            sender: req.user._id,
            receiver: crew.host,
            title: `${req.user.name}님이 가입했습니다.`,
            content: '당신의 크루에 신규 멤버가 있습니다.',
            event: 'NEW_MEMBER',
            route: `${req.baseUrl}/manage/${crew._id}`,
            target: [req.user._id]
        } : {
            sender: req.user._id,
            receiver: crew.host,
            title: `${req.user.name}님의 가입 신청`,
            content: '당신의 크루에 가입하고 싶습니다.',
            event: 'CREW_APPLICATION',
            route: `${req.baseUrl}/manage/${crew._id}`,
            target: []
        };

        req.notiData = notiData;
        next();
    } catch (error) {
        return res.status(500).json({ message: `DB오류 : ${error.message}` });
    }    
};

const joinMiddleware = async (req, res, next)=>{
    const { appId, action } = req.params;
    if(action !== 'accept' && action !== 'reject') return res.status(400).json({ message: "잘못된 요청입니다." });

    try {
        const app = await applicationService.findAppById(appId);
        if (!app) return res.status(404).json({ message: "신청을 찾을 수 없습니다." });
        req.params.crewId = app.crewId.toString();
        next();
    } catch (error) {
        next(error);
    }
    
}

module.exports = {
    isHost,
    isMember,
    isCrewExist,
    loginValidation,
    regularCreateMiddleware,
    applicationValidation,
    joinMiddleware
}