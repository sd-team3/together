const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        sender: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            default: null
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            required: true
        },
        title: { type: String },
        content: { type: String },
        event: { 
            type: String, 
            required: true 
        },
        route: { type: String },
        target: { 
            type: [mongoose.Schema.Types.ObjectId],
            default: []
        },
        isRead: {
            type: Boolean,
            default: false
        }
    }, {
        timestamps: true
    }
);

notificationSchema.index({ receiver: 1, createdAt: -1 });
notificationSchema.index({ receiver: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const notification = mongoose.model('notification', notificationSchema);

module.exports = notification;