const mongoose = require('mongoose');
const notification = require('../models/notification');

const findUnReadNotiByUserId = async (userId)=>{
    return await notification.find({ receiver: user._id, isRead: false });
}

module.exports = { findUnReadNotiByUserId };