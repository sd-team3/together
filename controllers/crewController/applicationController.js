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
            host = host.toString();
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
                title: `${req.user.name}님의 가입 신청`,
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

const getPendingApplication = async (req, res) => {
    try {
        const { crewId } = req.body;
        const pendingApplications = await applicationService.findPendingApplicationsByCrewId(crewId);
        res.json(pendingApplications);
    } catch (error) {
        res.status(500).json({ message: 'regularRouter' });
    }
};

const getAcceptApplication = async (req, res) => {
    const { appId } = req.body;
    const currUserId = req.user._id;

    applicationService.acceptApplication(appId, currUserId);
};

const rejectApplication = async (req, res) => {

}

module.exports = {
    postApplication,
    getPendingApplication,
    getAcceptApplication,
    rejectApplication
}