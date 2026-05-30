const mongoose = require('mongoose');
const applicationService = require('../../services/crew/applicationService');
const notiService = require('../../services/notiService');
const regularService = require('../../services/crew/regularService');
//const instCrewService = require('../../services/crew/instCrewService');


const postApplication = async (req, res)=>{
    const userId = req.user._id;
    const crew = req.crew;
    const crewType = req.baseUrl;
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const newApp = await applicationService.createApplication(userId, crew._id, crewType, { session });
        const notiData = {
            sender: userId,
            receiver: host,
            title: `${req.user.name}님의 가입 신청`,
            content: '당신의 크루에 가입하고 싶습니다.',
            event: 'CREW_APPLICATION',
            route: `/${crewType}/${crewId}/application`,
            target: [newApp._id]
        };
        
        const newNoti = await notiService.createNoti(notiData, { session });

        await session.commitTransaction();
        session.endSession();

        const io = req.app.get('io');
        io.of('/noti').to(`user:${host}`).emit('CREW_APPLICATION', newNoti);

        return res.status(201).json({ message: "신청이 완료되었습니다.", application: newApp });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "appCtrl:Transaction" });
        throw error;
    }
};


const getPendingApplication = async (req, res) => {
    try {
        const { crewId } = req.body;
        const pendingApplications = await applicationService.findPendingApplicationsByCrewId(crewId);
        res.json(pendingApplications);
    } catch (error) {
        res.status(500).json({ message: 'regularRouter' });
    }
};

const joinProcess = async (req, res) => {
    if(action === 'reject') {

    }
};

module.exports = {
    postApplication,
    getPendingApplication,
    //getJoinProcess
}