const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            required: true,
            index: true
        },
        type: { 
            type: String, 
            enum: [
                'CREW_ACCEPTED', //이처럼 조건문에 넣을 알림 타입 명세
                'CREW_REJECTED', 
                'NEW_APPLICANT'
            ],
            required: true 
        },
        title: { type: String },
        content: { type: String },
        action: {
            route: { 
                type: String, 
                enum: [
                    'crew/:id....' //라우팅 처리할 커맨드 적음
                ],
                required: true 
            },
            target: { type: mongoose.Schema.Types.ObjectId }
        },
        isRead: { type: Boolean, default: false }
    }, {
        timestamps: true
    }
);