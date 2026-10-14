const crewActivity = require('../../models/crewActivity');
const activityService = require('../../services/crew/activityService');
const User = require('../../models/User');

const postActivityCreate = async (req, res)=>{
    try {
        const result = await activityService.createActivity(req.activityData);
        return res.status(201).json({ message: "개설 성공!" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

const postProgress = async (req, res) => {
    try {
        const act = req.activity; 
        const koreanStatus = req.koreanStatus;

        if (!koreanStatus) return res.status(400).json({ message: '올바르지 않은 상태 변경 요청입니다.' });

        act.status = koreanStatus;
        await act.save();
        return res.status(200).json({ message: `활동 상태가 성공적으로 [${koreanStatus}] 상태로 변경되었습니다.` });

    } catch (error) {
        console.error('postProgress 컨트롤러 에러:', error);
        return res.status(500).json({ message: '상태 변경 중 오류가 발생했습니다.' });
    }
};

const postEntry = async (req, res) => {
    try {
        const act = req.activity;
        const userId = req.user._id;

        const allParticipants = [
            ...(act.participants || []),
            ...(act.teamRed || []),
            ...(act.teamBlue || [])
        ].map(id => id.toString());

        if (allParticipants.includes(userId.toString())) {
            return res.status(400).json({ message: "이미 참가한 활동입니다." });
        }

        if (allParticipants.length >= act.capacity) {
            return res.status(400).json({ message: "이미 마감된 활동입니다." });
        }

        if (act.gameType === 'team') {
            const redCount = act.teamRed ? act.teamRed.length : 0;
            const blueCount = act.teamBlue ? act.teamBlue.length : 0;
            
            if (redCount <= blueCount) {
                act.teamRed.push(userId);
            } else {
                act.teamBlue.push(userId);
            }
        } else {
            act.participants.push(userId);
        }

        const newTotalCount = allParticipants.length + 1;
        if (newTotalCount >= act.capacity) {
            act.status = '마감';
        }

        await act.save();

        return res.status(200).json({ 
            message: act.status === '마감' ? "참가 완료! 정원이 마감되었습니다." : "참가 완료되었습니다." 
        });

    } catch (error) {
        console.error('postEntry 에러:', error);
        return res.status(500).json({ message: "참가 처리 중 오류가 발생했습니다." });
    }
};

const postAttendance = async (req, res) => {
    try {
        const act = req.activity; 
        const userId = req.user._id;
        const { lat, lng } = req.body; 

        const latitude = Number(lat);
        const longitude = Number(lng);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({ message: "위치 정보(좌표)가 올바르지 않습니다." });
        }
        if (act.status !== '활동') return res.status(400).json({ message: "현재 출석 체크 가능한 시간이 아닙니다." });

        const participantIds = [...(act.teamBlue || []), ...(act.teamRed || [])].map(id => id.toString());
        if (!participantIds.includes(userId.toString())) return res.status(403).json({ message: "경기 참가자만 출석 체크할 수 있습니다." });

        const isAlreadyAttended = act.attender.some(id => id.toString() === userId.toString());
        if (isAlreadyAttended) return res.status(400).json({ message: "이미 출석 완료된 유저입니다." });

        const R = 6371;
        const dLat = (latitude - act.location.lat) * Math.PI / 180;
        const dLon = (longitude - act.location.lng) * Math.PI / 180;
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(act.location.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        if (distance > 0.5) {
            const limitMeter = Math.round(distance * 1000); 
            return res.status(400).json({ message: `모임 장소에서 너무 멉니다. (현재 거리: 약 ${limitMeter}m) 500m 이내로 접근해주세요.` });
        }

        act.attender.push(userId);
        await act.save();

        return res.status(200).json({ message: "출석이 정상적으로 완료되었습니다!" });

    } catch (error) {
        console.error('출석 체크 에러:', error.message);
        return res.status(500).json({ message: "서버 오류로 인해 출석 처리에 실패했습니다." });
    }
};

const getMannerReview = async (req, res) => {
    try {
        const act = req.activity;
        const userId = req.user._id.toString();
        if (act.status !== '종료' || !act.endTime || new Date(act.endTime) > new Date()) {
            return res.status(400).render('error/error_400', { statusCode: 400, message: '경기가 종료된 후 평가할 수 있습니다.' });
        }

        const attendees = await User.find({ _id: { $in: act.attender } }).select('name profileImage honor').lean();
        const isAttendee = attendees.some(user => user._id.toString() === userId);
        if (!isAttendee) {
            return res.status(403).send('출석한 참가자만 매너 평가를 할 수 있습니다.');
        }

        const myReviews = (act.mannerReviews || []).filter(review => review.reviewer.toString() === userId);
        const targets = attendees.filter(user => user._id.toString() !== userId);
        res.render('crew/mannerReview', { act, attendees: targets, myReviews, userId });
    } catch (error) {
        console.error('매너 평가 화면 오류:', error);
        res.status(500).render('error/error_500');
    }
};

const postMannerReview = async (req, res) => {
    try {
        const act = req.activity;
        const reviewerId = req.user._id;
        if (act.status !== '종료' || !act.endTime || new Date(act.endTime) > new Date()) {
            return res.status(400).json({ success: false, message: '경기가 종료된 후 평가할 수 있습니다.' });
        }

        const attendeeIds = (act.attender || []).map(id => id.toString());
        if (!attendeeIds.includes(reviewerId.toString())) {
            return res.status(403).json({ success: false, message: '출석한 참가자만 평가할 수 있습니다.' });
        }

        const ratings = req.body.ratings;
        if (!Array.isArray(ratings) || ratings.length !== attendeeIds.length - 1) {
            return res.status(400).json({ success: false, message: '출석한 다른 참가자를 모두 평가해주세요.' });
        }

        const seen = new Set();
        const normalized = [];
        for (const item of ratings) {
            const revieweeId = String(item?.revieweeId || '');
            const score = Number(item?.score);
            if (!attendeeIds.includes(revieweeId) || revieweeId === reviewerId.toString() || seen.has(revieweeId) || ![-1, 0, 1].includes(score)) {
                return res.status(400).json({ success: false, message: '평가 대상 또는 점수 값이 올바르지 않습니다.' });
            }
            seen.add(revieweeId);
            normalized.push({ reviewer: reviewerId, reviewee: revieweeId, score, createdAt: new Date() });
        }

        const alreadyReviewed = (act.mannerReviews || []).some(review => review.reviewer.toString() === reviewerId.toString());
        if (alreadyReviewed) {
            return res.status(409).json({ success: false, message: '이미 이 경기의 매너 평가를 하였습니다.' });
        }

        const updated = await crewActivity.findOneAndUpdate(
            { _id: act._id, status: '종료', attender: reviewerId, 'mannerReviews.reviewer': { $ne: reviewerId } },
            { $push: { mannerReviews: { $each: normalized } } },
            { new: true }
        );
        if (!updated) {
            return res.status(409).json({ success: false, message: '이미 평가했거나 평가할 수 없는 경기입니다.' });
        }

        const increments = new Map();
        normalized.forEach(({ reviewee, score }) => increments.set(reviewee.toString(), score));
        await Promise.all([...increments].filter(([, score]) => score !== 0).map(([userId, score]) =>
            User.updateOne({ _id: userId }, { $inc: { honor: score } })
        ));

        return res.json({ success: true, message: '매너 평가가 저장되었습니다.' });
    } catch (error) {
        console.error('매너 평가 제출 오류:', error);
        return res.status(500).json({ success: false, message: '매너 평가 저장 중 오류가 발생했습니다.' });
    }
};

module.exports = {
    postActivityCreate,
    postProgress,
    postEntry,
    postAttendance,
    getMannerReview,
    postMannerReview
};
