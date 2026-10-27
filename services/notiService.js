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

const deleteNotiByNotiId = async (notiId) => {
    try {
        return await notification.findByIdAndDelete(notiId)
                                    .populate('sender', 'name')
                                    .sort({ createdAt: -1 });
    } catch (error) {
        console.error('delNoti: ', error);
        throw error;
    }
};

const readNotiByNotiId = async (notiId) => {
    try {
        return await notification.findByIdAndUpdate(notiId, { isRead: true });
    } catch (error) {
        console.error('readNoti: ', error);
        throw error;
    }
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
