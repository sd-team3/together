const { CONSTANTS } = require('../../config/constants');
const instantCrewService = require('../../services/crew/instantCrewService');

const getInstant = async (req, res) => {
    try {
        const crews = await instantCrewService.getInstantCrew();

        // ── DB에서 넘어온 crews 데이터를 JS에서도 사용 ──
        const crewsJson = crews.map(c => ({
            id:       c._id,
            title:    c.title,
            intro:    c.intro || '',
            sportKr:  CONSTANTS.SPORTS[c.sport]?.kr || c.sport,
            state:    c.address.state,
            city:     c.address.city,
            lat:      c.address.lat,
            lng:      c.address.lng,
            current:  c.member.memberList.length,
            capacity: c.member.capacity,
            host:     c.host.name || '익명',
            isAutoAccept: c.isAutoAccept,
            createdAt: c.createdAt,
            avgReputation: c.avgReputation || 0
        }));
        const pageData = {
            crews: crewsJson,
            isLoggedIn: req.isAuthenticated()
        };
        res.render('crew/instantCrew', { CONSTANTS, crews, pageData});
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
};


const getInstantCreate = (req, res) => {
    res.render('crew/instantCreate', {CONSTANTS:CONSTANTS});
}

const postInstantCreate = async (req, res) => {
    try {
        if(!req.isAuthenticated()){
            return res.redirect('/user/login');
        }
        const host = req.user._id;
        const data = req.body;

        data.isAutoAccept = (data.isAutoAccept === 'enable');

        const result = await instantCrewService.createInstantCrew(data, host);

        if(result.success) {
            return res.redirect('/');
        } else {
            return res.status(400).send();
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('서버 오류가 발생했습니다.');
    }
};

const postApplyInstantCrew = async (req, res) => {
    try {
        if(!req.isAuthenticated()){
            return res.status(401).json({success: false, message: '로그인이 필요합니다.'});
        }
        const { crewId } = req.params;
        const userId = req.user._id;

        const result = await instantCrewService.applyInstantCrew(crewId, userId);
        return res.json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
};

 module.exports = {getInstantCreate, postInstantCreate, getInstant, postApplyInstantCrew};