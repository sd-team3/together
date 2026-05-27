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

const getMyCrews = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        } // 로그인해야 보임
        
        const userId = req.user._id;
        const role = req.query.role || 'all'; // 디폴트 설정
        const crews = await regCrewService.getMyCrews(userId, role);
        res.render('crew/my-crews', { crews, role });
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const postMyCrewDelete = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }
        await regCrewService.deleteMyCrew(req.params.regularCrewId);
        res.redirect('/crew/my-crews');
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const postMyCrewWithdraw = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }
        await regCrewService.withdrawMyCrew(req.params.regularCrewId, req.user._id);
        res.redirect('/crew/my-crews');
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const getCrewDetail = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }
        const crew = await regCrewService.getCrewDetail(req.params.regularCrewId);
        const isLiked = crew.likedBy.some(id => id.toString() === req.user._id.toString());
        res.render('crew/crew-detail', { crew, isLiked });
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const postCrewLike = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }
        await regCrewService.crewLike(req.params.regularCrewId, req.user._id);
        res.json({success: true});
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

module.exports = {
    getRegCreate,
    postRegCreate, //기능명세
    getMyCrews, // 불러오기
    postMyCrewDelete,
    postMyCrewWithdraw,
    getCrewDetail,
    postCrewLike
};