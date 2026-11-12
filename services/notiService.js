const mongoose = require('mongoose');
const notification = require('../models/notification');

async function createNoti(notiData, options = {}) {
    const noti = new notification(notiData);
    return await noti.save({ session: options.session });
}

async function createReminderNoti(notiData) {
    // 여러 서버가 동시에 실행돼도 DB의 고유 인덱스로 중복 저장을 막는다.
    await notification.init();

    try {
        return await createNoti(notiData);
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.reminderKey) {
            return null;
        }
        throw error;
    }
}

const findUnReadNotiByUserId = async (userId)=>{
    try {
        return await notification.find({ receiver: userId, isRead: false });
    } catch (error) {
        console.error('loadUnreadNoti: ', error);
        throw error;
    }
}

const findReadNotiByUserId = async (userId)=>{
    try {
        return await notification.find({ receiver: userId, isRead: true })
                                    .populate('sender', 'name')
                                    .sort({ createdAt: -1 });
    } catch (error) {
        console.error('loadReadNoti: ', error);
        throw error;
    }
}

function requireNotificationOwner(notiId, userId) {
    if (!mongoose.isObjectIdOrHexString(notiId) || !mongoose.isObjectIdOrHexString(userId)) {
        throw Object.assign(new Error('올바르지 않은 알림 요청입니다.'), { status: 400 });
    }
}

function requireNotification(noti) {
    if (!noti) throw Object.assign(new Error('알림을 찾을 수 없습니다.'), { status: 404 });
    return noti;
}

const deleteNotiByNotiId = async (notiId, userId) => {
    requireNotificationOwner(notiId, userId);
    const noti = await notification.findOneAndDelete({ _id: notiId, receiver: userId });
    return requireNotification(noti);
};

const readNotiByNotiId = async (notiId, userId) => {
    requireNotificationOwner(notiId, userId);
    const noti = await notification.findOneAndUpdate(
        { _id: notiId, receiver: userId }, { isRead: true }
    );
    return requireNotification(noti);
};

const readAllNotiByUserId = async (userId) => {
    try {
        return await notification.updateMany(
            { receiver: userId, isRead: false },
            { isRead: true }
        );
    } catch (error) {
        console.error('readAllNoti:', error);
        throw error;
    }
};

const handleUserDeleted = async (userId) => {
    try {
        return await Notification.deleteMany({
            $or: [{ sender : userId }, { receiver : userId }]
        });
    } catch (error) {
        console.error('handleUserDeletedNoti:', error);
        throw error;
    }
}

module.exports = { 
    createNoti,
    createReminderNoti,
    findUnReadNotiByUserId, 
    findReadNotiByUserId,
    readNotiByNotiId, 
    readAllNotiByUserId, 
    deleteNotiByNotiId, 
    handleUserDeleted
};
