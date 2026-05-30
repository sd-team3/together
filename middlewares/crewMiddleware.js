const { accessSync } = require('node:fs');
const regularCrew = require('../models/regularCrew');
const instantCrew = require('../models/regularCrew');
const regularService = require('../services/crew/regularService');

const applicationValidation = async (req, res, next)=>{
    const userId = req.user._id;
    const { crewId } = req.body;
    const crewType = req.baseUrl;

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

        if (!host || !crew) {
            return res.status(404).json({ message: "존재하지 않는 크루입니다." });
        }

        if (crew.member.memberList.length >= crew.member.capacity) {
            return res.json({ message: "MAX_CAPACITY" });
        }

        const isMember = crew.member.memberList.some(m => m.user.toString() === userId);
        if (isMember) {
            return res.json({ message: "DUP_APPLICATION" });
        }

        const ageGroup = req.user.age >= 60 ? '60+' : `${Math.floor(req.user.age / 10) * 10}s`;
        if (!crew.ageRange.includes('all') && !crew.ageRange.includes(ageGroup)) {
            return res.json({ message: "WRONG_AGE_RANGE" });
        }

        req.crew = crew;
        next();
    } catch (error) {
        next(error);
    }
}

const joinProcessValidation = async (req, res, next)=>{
    const userId = req.user._id;
    const crewType = req.crewType;
    const { crewId, appUserId, action } = req.params;

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

        if(host !== userId) return res.status(403).json({ message: "당신은 권한이 없습니다." });
        if(!appUserId)      return res.status(404).json({ message: "신청자를 찾을 수 없습니다." });
        if(!crew)           return res.status(404).json({ message: "크루를 찾을 수 없습니다." });
        if(!action)         return res.status(400).json({ message: "잘못된 요청입니다." });

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