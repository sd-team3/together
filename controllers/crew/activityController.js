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