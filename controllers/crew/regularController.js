const mongoose = require('mongoose');
const { authenticate } = require('passport');
const { CONSTANTS } = require('../../config/constants');
const regularService = require('../../services/crew/regularService');

const getRegularCreate = (req, res)=>{
    res.render('crew/regularCreate', { CONSTANTS: CONSTANTS });
}

const postRegularCreate = async (req, res)=>{
    const { data, profileImage, host } = req.crewData;

    try {
        const result = await regularService.createRegCrew(data, profileImage, host);

        if (result.success) {
            return res.redirect('/regular/list');
        } else {
            return res.status(400).send();
        } 
    } catch (error) {
        console.error(error);
        return res.status(500).send('서버 오류가 발생했습니다.');
    }
};

const getRegular = async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    try {
        const result = await regularService.getRegularCrews(page);
        
        res.render('crew/regular', {
            title : '정기모임 페이지', 
            regularCrews: result.regularCrews,
            currentPage: result.currentPage,
            totalPages : result.totalPages,
            CONSTANTS
        });
    } catch (error) {
        next(error);
    }
};
// api를 이용해서 정기모임 페이지 열람
const getRegularAPI = async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    try {
        const changeArray = (val) => val ? (Array.isArray(val) ? val : [val]) : undefined;
        const filter = {
            day : changeArray(req.query.day),
            isAutoAccept : req.query.isAutoAccept,
            sport : changeArray(req.query.sport),
            ageRange : changeArray(req.query.ageRange),
            state : req.query.state,
            city : req.query.city,
            isRecruiting : req.query.isRecruiting === 'true'
        }
        const result = await regularService.getRegularAPICrews(filter, page);
        res.json({
            success : true,
            regularCrews: result.regularCrews,
            currentPage: result.currentPage,
            totalPages : result.totalPages,
        })
    } catch (error) {
        next(error);
    }
};
// 정기모임 상세 페이지
const getRegularPage = async (req, res, next) => {
    try {
        const { crewId } = req.params;
        const crew = await regularService.getCrewDetail(crewId);
        let userId;
        let isLiked;

        if (req.isAuthenticated()) {
            userId = req.user._id;
            isLiked = crew.likedBy && crew.likedBy.some(id => id.toString() === req.user._id.toString());

        } else {
            userId = null;
        }

        res.render('crew/regular-join-page', { crew, isLiked, userId });
    } catch (error) {
        next(error);
    }
}

const getMyCrews = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        } // 로그인해야 보임
        
        const userId = req.user._id;
        const role = req.query.role || 'all'; // 디폴트 설정
        const crews = await regularService.getMyCrews(userId, role);
        res.render('crew/my', { crews, role });
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const getMyCrewsApi = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }
        const userId = req.user._id;
        const role = req.query.role || 'all';
        const crews = await regularService.getMyCrews(userId, role);
        res.json({ crews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
}

const postMyCrewDelete = async (req, res) => {
    try {
        await regularService.deleteMyCrew(req.params.crewId);
        res.redirect('/regular/my');
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const postMyCrewWithdraw = async (req, res) => {
    try {
        await regularService.withdrawMyCrew(req.params.crewId, req.user._id);
        res.redirect('/regular/my');
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
        await regularService.crewLike(req.params.regularCrewId, req.user._id);
        res.json({success: true});
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const getCrewManage = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }
        const crew = await regularService.getCrewManage(req.params.regularCrewId);
        const pendingApps = await regularService.getCrewManage(req.params.regularCrewId);
        res.render('crew/crewManage', { crew, pendingApps });
    } catch(error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const getCrewActivity = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/user/login');
        }
        const crew = await regularService.getCrewActivity(req.params.regularCrewId);
        res.render('crew/crewActivity', { crew });
    } catch(error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

module.exports = {
    getRegularCreate,
    postRegularCreate, //기능명세
    getMyCrews, // 불러오기
    postMyCrewDelete,
    postMyCrewWithdraw,
    postCrewLike,
    getRegular,
    getRegularAPI,
    getMyCrewsApi,
    getCrewManage,
    getRegularPage,
    getCrewActivity
};