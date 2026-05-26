const mongoose = require('mongoose');
const notification = require('../models/notification');

async function createNoti(notiData, options = {}) {
    const noti = new notification(notiData);
    return await noti.save({ session: options.session });
}

const findUnReadNotiByUserId = async (userId)=>{
    try {
        return await notification.find({ receiver: user._id, isRead: false });
    } catch (error) {
        console.error('loadUnreadNoti: ', error);
        throw error;
    }
}

const findReadNotiByUserId = async (userId)=>{
    try {
        return await notification.find({ receiver: user._id, isRead: true })
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
        return await Notification.updateMany(
            { receiver: userId, isRead: false },
            { isRead: true }
        );
    } catch (error) {
        console.error('readAllNoti:', error);
        throw error;
    }
};

module.exports = { 
    createNoti,
    findUnReadNotiByUserId, findReadNotiByUserId,
    readNotiByNotiId, readAllNotiByUserId, deleteNotiByNotiId
};