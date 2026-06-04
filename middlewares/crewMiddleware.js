const { accessSync } = require('node:fs');
const regularCrew = require('../models/regularCrew');
const instantCrew = require('../models/regularCrew');
const regularService = require('../services/crew/regularService');
const applicationService = require('../services/crew/applicationService');

async function userAndCrewValidation(req, res) {
    if(!req.user || !req.user._id) return res.status(401).json({ message: "로그인을 선행해야 합니다." });

    const userId = req.user._id;
    const { crewId } = req.params;
    const crewType = req.crewType;

    let host = null;
    let crew = null;

    try {
        if(crewType === 'regular') {
            host = await regularService.findHostByCrewId(crewId);
            crew = await regularCrew.findById(crewId);
        }
        if(crewType === 'instant') {
            //host = await instCrewService.findHostByCrewId(crewId);
            //crew = await instantCrew.findById(crewId);
        }
    } catch {
        return res.status(500).json({ message: "DB 오류입니다." });
    }

    return { host, crew };
}

const applicationValidation = async (req, res, next)=>{
    const { host, crew } = userAndCrewValidation(req, res);
    
    const isMember = crew.member.memberList.some(m => m.user.toString() === userId);
    const ageGroup = req.user.age >= 60 ? '60+' : `${Math.floor(req.user.age / 10) * 10}s`;

    if (!host || !crew) return res.status(404).json({ message: "존재하지 않는 크루입니다." });
    if (crew.member.memberList.length >= crew.member.capacity) return res.status(400).json({ message: "최대 인원에 도달한 크루입니다." });
    if (isMember) return res.status(404).json({ message: "이미 가입된 크루입니다." });
    if (!crew.ageRange.includes('all') && !crew.ageRange.includes(ageGroup)) return res.status(404).json({ message: "현재 연령대는 가입 불가한 크루입니다." });

    req.crew = crew;
    next();
}

const getPendingValidation = async (req, res, next)=>{
    const { host, crew } = userAndCrewValidation(req, res);

    if(!host || !crew)  return res.status(404).json({ message: "존재하지 않는 크루입니다." });
    if(host !== userId) return res.status(403).json({ message: "당신은 권한이 없습니다." });
}

const joinProcessValidation = async (req, res, next)=>{
    const userId = req.user._id;
    const { appId, action } = req.params;

    let host = null;
    let crew = null;

    try {
        const app = await applicationService.findAppById(appId);
        if(app.crewType === 'regular') {
            host = await regularService.findHostByCrewId(app.crewId);
            crew = await regularCrew.findById(app.crewId);
        }
        if(app.crewType === 'instant') {
            //host = await instCrewService.findHostByCrewId(app.crewId);
            //crew = await instantCrew.findById(app.crewId);
        }

        if(!host || !crew) return res.status(404).json({ message: "존재하지 않는 크루입니다." });
        if(host !== userId) return res.status(403).json({ message: "당신은 권한이 없습니다." });
        if(!app.userId) return res.status(404).json({ message: "신청자를 찾을 수 없습니다." });
        if(!crew) return res.status(404).json({ message: "크루를 찾을 수 없습니다." });
        if(action !== 'accept' || action !== 'reject') return res.status(400).json({ message: "잘못된 요청입니다." });

        req.app = app;
        req.crew = crew;
        next();
    } catch (error) {
        next(error);
    }
    
}

module.exports = {
    applicationValidation,
    joinProcessValidation
}