const mongoose = require('mongoose');
const { authenticate } = require('passport');
const { CONSTANTS } = require('../../config/constants');
const regCrewService = require('../../services/crew/regCrewService');

const getRegCreate = (req, res)=>{
    res.render('crew/regCreate', { CONSTANTS: CONSTANTS });
}

const postRegCreate = async (req, res)=>{
    try {
        if(!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }

        const host = req.user._id;
        const data = req.body;
        const profileFile = req.file;

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

        const result = await regCrewService.createRegCrew(data, profileFile, host);
        
        if (result.success) {
            return res.redirect('/crew/reg-list');
        } else {
            return res.status(400).send();
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('서버 오류가 발생했습니다.');
    }
};

module.exports = {
    getRegCreate,
    postRegCreate //기능명세
};