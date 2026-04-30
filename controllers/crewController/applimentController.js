const applimentService = require('../../services/crew/applimentService');

const postAppliment = async (req, res)=>{
    const userId = req.user._id;
    const { crewId, crewType } = req.body; //페이지 이벤트 처리에서 fetch를 통해 body를 쏴줘야함

    await applimentService.createAppliment(userId, crewId, crewType);


};

module.exports = {
    postAppliment //기능명세
}