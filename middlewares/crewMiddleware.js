const { authenticate } = require('passport');
const applicationService = require('../services/crew/applicationService');
const crewService = require('../services/crew/crewService');

async function hostandCrewMiddleware(req) {
    const { crewId } = req.params;

    try {
        const host = await crewService.findHostByCrewId(req.crewModel, crewId);
        const crew = await req.crewModel.findById(crewId);

        return { host, crew };
    } catch {
        return null;
    }
}

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
    const { host, crew } = await hostandCrewMiddleware(req);
    
    if (!host || !crew) return res.status(404).json({ message: "존재하지 않는 크루입니다." });

    const isMember = crew.member.memberList.some(m => m.user.toString() === req.user._id);
    const ageGroup = req.user.age >= 60 ? '60+' : `${Math.floor(req.user.age / 10) * 10}s`;

    if (crew.member.memberList.length >= crew.member.capacity) return res.status(400).json({ message: "최대 인원에 도달한 크루입니다." });
    if (isMember) return res.status(404).json({ message: "이미 가입된 크루입니다." });
    if (!crew.ageRange.includes('all') && !crew.ageRange.includes(ageGroup)) return res.status(404).json({ message: "현재 연령대는 가입 불가한 크루입니다." });

    const notiData = crew.isAutoAccept ?
    {
        sender: req.user._id,
        receiver: host,
        title: `${req.user.name}님이 가입했습니다.`,
        content: '당신의 크루에 신규 멤버가 있습니다.',
        event: 'NEW_MEMBER',
        route: `${req.baseUrl}/detail`,
        target: [req.user._id]
    } : {
        sender: req.user._id,
        receiver: host,
        title: `${req.user.name}님의 가입 신청`,
        content: '당신의 크루에 가입하고 싶습니다.',
        event: 'CREW_APPLICATION',
        route: `${req.baseUrl}/pending`,
        target: []
    };

    req.notiData = notiData;
    req.crew = crew;
    next();
};

const getPendingValidation = async (req, res, next)=>{
    const { host, crew } = await hostandCrewMiddleware(req);

    if(!host || !crew)  return res.status(404).json({ message: "존재하지 않는 크루입니다." });
    if(host !== userId) return res.status(403).json({ message: "당신은 권한이 없습니다." });
}

const joinMiddleware = async (req, res, next)=>{
    if(action !== 'accept' || action !== 'reject') return res.status(400).json({ message: "잘못된 요청입니다." });
    const { appId, action } = req.params;

    try {
        const host = await crewService.findHostByCrewId(req.crewModel, app.crewId);
        const crew = await req.crewModel.findById(app.crewId);

        if(!host || !crew) return res.status(404).json({ message: "존재하지 않는 크루입니다." });
        if(host !== req.user._id) return res.status(403).json({ message: "당신은 권한이 없습니다." });
        
        req.crew = crew;
        next();
    } catch (error) {
        next(error);
    }
    
}

module.exports = {
    loginValidation,
    regularCreateMiddleware,
    applicationValidation,
    getPendingValidation,
    joinMiddleware
}