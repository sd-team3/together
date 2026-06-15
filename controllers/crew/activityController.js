const crewActivity = require('../../models/crewActivity');
const activityService = require('../../services/crew/activityService');

const postActivityCreate = async (req, res)=>{
    try {
        const result = await activityService.createActivity(req.activityData);
        return res.status(201).json({ message: "개설 성공!" });
    } catch (error) {
        return res.status(500).json({ message: "DB오류" });
    }
}

const postProgress = async (req, res) => {
    try {
        const act = req.activity; 
        const { koreanStatus } = req.koreanStatus;

        if (!koreanStatus) return res.status(400).json({ message: '올바르지 않은 상태 변경 요청입니다.' });

        act.status = koreanStatus;
        await act.save();
        return res.status(200).json({ message: `활동 상태가 성공적으로 [${koreanStatus}] 상태로 변경되었습니다.` });

    } catch (error) {
        console.error('postProgress 컨트롤러 에러:', error);
        return res.status(500).json({ message: '상태 변경 중 오류가 발생했습니다.' });
    }
};


module.exports = {
    postActivityCreate,
    postProgress
};