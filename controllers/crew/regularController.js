const mongoose = require('mongoose');
const { authenticate } = require('passport');
const { CONSTANTS } = require('../../config/constants');
const regularService = require('../../services/crew/regularService');
const activityService = require('../../services/crew/activityService');
const { MIN_REVIEW_COUNT } = require('../../services/ai/reviewSummaryService');
const {
    getOrCreateReviewSummary
} = require('../../services/ai/reviewSummaryCacheService');

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
        const reviews = await regularService.getCrewReview(crewId);
        let userId;
        let isLiked;

        if (req.isAuthenticated()) {
            userId = req.user._id;
            isLiked = crew.likedBy && crew.likedBy.some(id => id.toString() === req.user._id.toString());

        } else {
            userId = null;
        }

        res.render('crew/regular-join-page', { crew, isLiked, userId , reviews});
    } catch (error) {
        next(error);
    }
}

const getMyCrews = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.query.role || 'all';
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
        await regularService.crewLike(req.params.crewId, req.user._id);
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
        const {crew, pendingApps} = await regularService.getCrewManage(req.params.crewId);
        const acts = await activityService.findActsByCrewId(req.params.crewId);
        res.render('crew/crewManage', { crew, pendingApps, CONSTANTS, acts });
    } catch(error) {
        console.error('getCrewManage 에러:', error);
        res.status(500).render('error/error_500');
    }
}

const postCrewUpdate = async (req, res) => {
    try {
        const updateData = {...req.body};
        if(req.file) updateData.profileImage = req.file.filename;
        await regularService.postCrewUpdate(req.params.crewId, updateData, req.file);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

const getCrewActivity = async (req, res) => {
    try {
        const crew = await regularService.getCrewActivity(req.params.crewId);
        res.render('crew/crewActivity', { crew });
    } catch(error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

// 후기 작성 컨트롤러
const postCrewReview = async (req, res) => {
    try {
        const score = Number(req.body.rating);

        const content = typeof req.body.content == 'string' ? req.body.content.trim() : '';

        if (!Number.isInteger(score) || score < 1 || score > 5) {
            return res.status(400).json({
                success : false,
                message : '평점은 1에서 5점 사이여야 합니다'
            });
        }

        if (!content) {
            return res.status(400).json({
                success : false,
                message : '후기 내용을 입력해주세요'
            });
        }

        if (content.length > 500) {
            return res.status(400).json({
                success : false,
                message : '후기는 최대 500자까지 작성할 수 있습니다'
            });
        }
        
        const review = await regularService.postCrewReview(
            req.params.crewId,
            req.user._id,
            {
                score,
                content
            }
        );

        return res.status(201).json({
            success : true,
            message: '후기가 등록되었습니다.',
            review
        });

    } catch(error) {
        console.error(error);
        res.status(500).render('error/error_500');
    }
}

// AI 후기 요약 컨트롤러
const getCrewReviewSummary = async (req, res) => {
    try {
        const reviews = await regularService.getCrewReview(req.params.crewId);

        if (reviews.length < MIN_REVIEW_COUNT) {
            return res.json({
                success: true,
                summary: null,
                message: `후기가 ${MIN_REVIEW_COUNT}개 이상일 때 AI 요약을 제공합니다.`
            });
        }

        const { summary, cacheHit } = await getOrCreateReviewSummary(
            req.params.crewId,
            reviews
        );

        return res.json({
            success: true,
            cached: cacheHit,
            summary
        });
    } catch (error) {
        console.error('AI 후기 요약 오류:', error.message);

        return res.status(503).json({
            success: false,
            message: 'AI 후기 요약을 잠시 사용할 수 없습니다.'
        });
    }
};

module.exports = {
    getRegularCreate,
    postRegularCreate, //기능명세
    getMyCrews,
    postMyCrewDelete,
    postMyCrewWithdraw,
    postCrewLike,
    getRegular,
    getRegularAPI,
    getMyCrewsApi,
    getCrewManage,
    postCrewUpdate,
    getRegularPage,
    getCrewActivity,
    postCrewReview,
    getCrewReviewSummary
};
