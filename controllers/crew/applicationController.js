const mongoose = require('mongoose');
const applicationService = require('../../services/crew/applicationService');
const notiService = require('../../services/notiService');
const webPushService = require('../../services/webPushService');
const crewService = require('../../services/crew/crewService');
const chatService = require('../../services/chatService');
const regularCrew = require('../../models/regularCrew');
const instantCrew = require('../../models/instantCrew');

const modelMap = {
    regularCrew: regularCrew,
    instantCrew: instantCrew
};

const postApplication = async (req, res)=>{
    const userId = req.user._id;
    const crew = req.crew;
    const crewType = req.crewModel.modelName;
    const notiData = req.notiData;
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        if(crew.isAutoAccept) {
            await crewService.addCrewToUser(userId, crew._id, { session });
            await crewService.addUserToCrew(userId, crew._id, req.crewModel, { session });
            await chatService.addMemberToChatRoom(crew._id, userId);
        } else {
            const newApp = await applicationService.createApp(userId, crew._id, crewType, { session });
            notiData.target = [newApp._id];
        }
        
        const newNoti = await notiService.createNoti(notiData, { session });

        await session.commitTransaction();

        const io = req.app.get('io');
        io.of('/noti').to(`user:${crew.host}`).emit(newNoti.event, newNoti);

        return res.status(201).json({
            success: true,
            relation: crew.isAutoAccept ? 'member' : 'pending',
            message: '참가 신청이 완료됐습니다.'
        });
    } catch (error) {
        if (session?.inTransaction()) await session.abortTransaction();
        if (error.code === 11000 && error.keyPattern?.crewId && error.keyPattern?.userId) {
            return res.status(409).json({ message: '이미 신청한 기록이 있습니다. 가입 상태를 확인해주세요.' });
        }
        console.error(error);
        return res.status(500).json({ message: '신청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
        await session?.endSession();
    }
};

const getRelation = async (req, res)=>{
    try {
        const { crewId } = req.params;
        const userId = req.user._id;
        const isMember = await crewService.userInCrew(req.crewModel, crewId, userId);
        const app = isMember ? null : await applicationService.findAppByCrewAndUser(crewId, userId);
        res.set('Cache-Control', 'no-store').json({ relation: isMember ? 'member' : app?.status || 'none' });
    } catch (error) {
        res.status(500).json({ message: '가입 상태를 확인하지 못했습니다.' });
    }
};


const getPendingApps = async (req, res) => {
    try {
        const pendingApps = await applicationService.findPendingAppsByCrewId(req.crew._id);
        res.json(pendingApps);
    } catch (error) {
        return res.status(500).json({ message: 'regularRouter' });
    }
};

const joinProcess = async (req, res) => {
    const { appId, action } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const app = await applicationService.appStatusUpdateById(appId, action, { session });
        if (!app) throw new Error('APPLICATION_NOT_FOUND');

        const isRegular = req.crewModel.modelName === 'regularCrew';
        const applicationType = isRegular ? '가입' : '참가';
        const notiData = {
            sender: req.user._id,
            receiver: app.userId,
            title: `${req.crew.title} ${applicationType} 신청이 ${action === 'accept' ? '승인' : '거절'}되었습니다.`,
            content: `${applicationType} 신청이 ${action === 'accept' ? '승인' : '거절'}되었습니다.`,
            event: `APPLICATION_${action === 'accept' ? 'ACCEPTED' : 'REJECTED'}`,
            route: `/${isRegular ? 'regular' : 'instant'}/list/${app.crewId}`,
            target: []
        };

        if (action === 'accept') {
            const utc = await crewService.addUserToCrew(app.userId, app.crewId, req.crewModel, { session });
            const ctu = await crewService.addCrewToUser(app.userId, app.crewId, { session });
            await chatService.addMemberToChatRoom(app.crewId, app.userId);

            if(!utc || !ctu) throw new Error('ADD_USER_TO_CREW_FAILED');
        }
        const newNoti = await notiService.createNoti(notiData, { session });
        await session.commitTransaction();

        const io = req.app.get('io');
        io.of('/noti').to(`user:${app.userId}`).emit(newNoti.event, newNoti);
        if (action === 'accept') void webPushService.sendNotification(newNoti);

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
    getRelation,
    joinProcess
}
