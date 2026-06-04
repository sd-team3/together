const mongoose = require('mongoose');
const applicationService = require('../../services/crew/applicationService');
const notiService = require('../../services/notiService');
const crewService = require('../../services/crew/crewService');
const regularService = require('../../services/crew/regularService');
const chatService = require('../../services/chatService');
//const instCrewService = require('../../services/crew/instCrewService');


const postApplication = async (req, res)=>{
    const userId = req.user._id;
    const crew = req.crew;
    const crewType = req.crewType;
    let notiData = req.notiData;
    
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if(crew.isAutoAccept) {
            await crewService.addCrewToUser(userId, crew._id, { session });
            await crewService.addUserToCrew(userId, crew._id, crewType, { session });
        } else {
            const newApp = await applicationService.createApp(userId, crew._id, crewType, { session });
            notiData.target = [newApp._id];
        }
        
        const newNoti = await notiService.createNoti(notiData, { session });

        await session.commitTransaction();
        session.endSession();

        const io = req.app.get('io');
        io.of('/noti').to(`user:${crew.host}`).emit(newNoti.event, newNoti);

        return res.status(201).json();
    } catch (error) {
        if (session && session.inTransaction()) await session.abortTransaction();
        if (session) session.endSession();
        res.status(500).json({ message: "appCtrl:Transaction" });
        throw error;
    }
};


const getPendingApps = async (req, res) => {
    try {
        const { crewId } = req.body;
        const pendingApps = await applicationService.findPendingAppsByCrewId(crewId);
        res.json(pendingApps);
    } catch (error) {
        res.status(500).json({ message: 'regularRouter' });
    }
};

const joinProcess = async (req, res) => {
    const { appId, action } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const app = await applicationService.appStatusUpdateById(appId, action, { session });
        if (!app) throw new Error('APPLICATION_NOT_FOUND');

        const notiData = {
            sender: req.user._id,
            receiver: app.userId,
            title: `${req.crew.title} 크루 가입이 ${action === 'accept' ? '승인' : '거절'}되었습니다.`,
            content: `당신의 가입 요청이 ${action === 'accept' ? '승인' : '거절'}되었습니다.`,
            event: `APPLICATION_${action === 'accept' ? 'ACCEPTED' : 'REJECTED'}`,
            route: `${req.baseUrl}/detail/${app.crewId}`,
            target: []
        };

        if (action === 'accept') {
            const utc = await crewService.addUserToCrew(app.userId, app.crewId, req.crewModel, { session });
            const ctu = await crewService.addCrewToUser(app.userId, app.crewId, { session });

            if(!utc || !ctu) throw new Error('ADD_USER_TO_CREW_FAILED');
        }

        const newNoti = await notiService.createNoti(notiData, { session });
        await session.commitTransaction();

        const io = req.app.get('io');
        io.of('/noti').to(`user:${app.userId}`).emit(newNoti.event, newNoti);

        return res.status(200).json({ success: true, message: '처리가 완료되었습니다.' });
    } catch (error) {
        await session.abortTransaction();

        if (error.message === 'APPLICATION_NOT_FOUND') return res.status(404).json({ message: '존재하지 않는 가입 신청입니다.' });
        if (error.message === 'ADD_USER_TO_CREW_FAILED') return res.status(400).json({ message: '이미 가입된 멤버이거나 승인에 실패했습니다.' });

        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        session.endSession();
    }    
};

module.exports = {
    postApplication,
    getPendingApps,
    joinProcess
}