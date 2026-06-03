const { CONSTANTS } = require('../../config/constants');
const instantService = require('../../services/crew/instantService');

const getInstant = async (req, res) => {
    try {
        const filter = {
            sport: req.query.sport ? req.query.sport.split(',') : null,
            state: req.query.state || null,
            city: req.query.city || null,
            isAutoAccept: req.query.isAutoAccept || null,
            isRecruiting: req.query.isRecruiting || null
        };
        
        const { crews } = await instantService.getInstantCrew();

        // ── DB에서 넘어온 crews 데이터를 JS에서도 사용 ──
        const crewsJson = crews.map(c => ({
            id:       c._id,
            title:    c.title,
            intro:    c.intro || '',
            sport:    c.sport,
            sportKr:  CONSTANTS.SPORTS[c.sport]?.kr || c.sport,
            state:    c.address.state,
            city:     c.address.city,
            lat:      c.address.lat,
            lng:      c.address.lng,
            current:  c.member.memberList.length,
            capacity: c.member.capacity,
            host:     c.host.name || '익명',
            isAutoAccept: c.isAutoAccept,
            meetAt: c.meetAt,
            createdAt: c.createdAt,
            avgReputation: c.avgReputation || 0
        }));
        //로그인한 유저의 관련 ID 목록
        let myCrewIds = [];
        if (req.isAuthenticated()) {
            const userId = req.user._id.toString();
            myCrewIds = crews
                .filter(c =>
                    c.host._id.toString() === userId ||
                    c.member.memberList.some(m => m.user?.toString() === userId)
                )
                .map(c => c._id.toString());
        }

        const pageData = {
            crews: crewsJson,
            isLoggedIn: req.isAuthenticated(),
            myCrewIds
        };
        res.render('crew/instantCrew', { CONSTANTS, crews, pageData});
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
};


const getInstantCreate = (req, res) => {
    if(!req.isAuthenticated()){
        return res.redirect('/user/login');
    }
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

        const result = await instantService.createInstantCrew(data, host);

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
 
const getInstantDetail = async(req, res, next) => {
    try {
        const crew = await instantService.getCrewDetail(req.params.instantId);
        if(!crew) return res.status(404).send('모임을 찾을 수 없습니다');

        if(!req.isAuthenticated()) {
            return res.render('crew/instantMyCrewDetail', { crew, CONSTANTS, isHost: false, isMember: false });
        }
        const userId = req.user._id.toString();
        const isHost = crew.host._id.toString() === userId;
        const isMember = crew.member.memberList.some(m => m.user._id.toString() === userId);
        res.render('crew/instantMyCrewDetail', {crew, CONSTANTS, isHost, isMember});
    } catch (error) {
        next(error);
    }
};
// 번개 모임 삭제
const deleteInstantCrew = async(req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/user/login');
    try {
        const crewId = req.params.instantId;
        const userId = req.user._id;
        const result = await instantService.deleteInstantCrew(crewId, userId);
        
        if(!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message});
        }
        return res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

//멤버 강퇴
const kickMember = async(req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/user/login');
    try {
        const { instantId, userId } = req.params;
        const hostId = req.user._id;
        const result = await instantService.kickMember(instantId, hostId, userId);

        if(!result.success) {
            return res.status(result.status || 400).json({ success: false, message: result.message});
        }
        return res.json({success: true});
    } catch (error) {
        next(error);
    }
}


module.exports = {
    getInstantCreate, 
    postInstantCreate, 
    getInstant, 
    getInstantDetail,
    deleteInstantCrew,
    kickMember
};