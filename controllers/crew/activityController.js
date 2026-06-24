const crewActivity = require('../../models/crewActivity');
const activityService = require('../../services/crew/activityService');

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

        // 1. 좌표 누락 검증
        if (!lat || !lng) return res.status(400).json({ message: "위치 정보(좌표)가 누락되었습니다." });
        if (act.status !== '활동') return res.status(400).json({ message: "현재 출석 체크 가능한 시간이 아닙니다." });

        const isAlreadyAttended = act.attender.some(id => id.toString() === userId.toString());
        if (isAlreadyAttended) return res.status(400).json({ message: "이미 출석 완료된 유저입니다." });

        const R = 6371;
        const dLat = (lat - act.location.lat) * Math.PI / 180;
        const dLon = (lng - act.location.lng) * Math.PI / 180;
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(act.location.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            
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

module.exports = {
    postActivityCreate,
    postProgress,
    postEntry,
    postAttendance
};