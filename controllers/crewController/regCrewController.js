const regCrewService = require('../../services/crew/regCrewService');
const { CONSTANTS } = require('../../config/constants');

const getRegularCreate = (req, res)=>{
    res.render('crew/regular_create');
}

const postRegularCreate = async (req, res)=>{
    try {
        const sport = document.querySelector('.chip.on').dataset.value;
        const host = req.user._id;
        const { title, intro, capacity, period, day, ageRange, address, fee, profileImage } = req.body;
        
        if (!day) {
            day = ['none']; 
        } else if (!Array.isArray(day)) {
            day = [day];
        }

        if (!ageRange) {
            ageRange = ['all']; 
        } else if (!Array.isArray(ageRange)) {
            ageRange = [ageRange];
        }

        const crew = { title, intro, host, capacity, period, day, ageRange, address, sport, fee, profileImage };

        await regCrewService.createCrew(crew);
        res.redirect('crew/regular');
    } catch (error) {
        
    }
};

// 렌더링해서 정기모임 페이지 열람
const getRegular = async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    try {
        const result = await regCrewService.getRegularCrews(page);
        
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
        const result = await regCrewService.getRegularAPICrews(filter, page);
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

module.exports = {
    postRegularCreate, getRegular, getRegularAPI //기능명세
};