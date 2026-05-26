const mongoose = require('mongoose');
const applicationService = require('../../services/crew/applicationService');
const notiService = require('../../services/notiService');
const regCrewService = require('../../services/crew/regCrewService');
//const instCrewService = require('../../services/crew/instCrewService');

const postApplication = async (req, res)=>{
    const userId = req.user._id;
    const { crewId, crewType } = req.body;
    let host = null;
    let session = null;

    try {
        if(crewType === 'regularCrew') {
            host = await regCrewService.findHostByCrewId(crewId);
        }
        if(crewType === 'instantCrew') {
            //host = await instCrewService.findHostByCrewId(crewId);
        }
        if (!host) {
            return res.status(404).json({ message: "존재하지 않는 크루" });
        }
        

        try {
            session = await mongoose.startSession();
            session.startTransaction();

            const newApp = await applicationService.createApplication(userId, crewId, crewType, { session });
            const notiData = {
                sender: userId,
                receiver: host,
                title: `${req.user._id}님의 가입 신청`,
                content: '당신의 크루에 가입하고 싶습니다.',
                event: 'CREW_APPLICATION',
                route: `/${crewType === 'regularCrew' ? 'regular' : 'instant'}/${crewId}/application`,
                target: [newApp._id]
            }
            const newNoti = await notiService.createNoti(notiData, { session });

            await session.commitTransaction();
            session.endSession();

            const io = req.app.get('io'); 
            io.of('/noti').to(`user:${host}`).emit('CREW_APPLICATION', newNoti);

            return res.status(201).json({ message: "신청이 완료되었습니다.", application: newApp });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "appController" });
    }
    

    
    
    
};

module.exports = {
    postApplication //기능명세
}