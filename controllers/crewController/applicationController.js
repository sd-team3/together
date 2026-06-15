const applicationService = require('../../services/crew/applicationService');

const postApplication = async (req, res)=>{
    const userId = req.user._id;
    const { crewId, crewType } = req.body; //페이지 이벤트 처리에서 fetch를 통해 body를 쏴줘야함

    await applicationService.createApplication(userId, crewId, crewType);


};

module.exports = {
    postApplication //기능명세
}