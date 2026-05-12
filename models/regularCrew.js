const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');

const memberSchema = new mongoose.Schema(
    {
        capacity: {
            type: Number,
            required: true,
            min: [1, 'MEMBER_CAPACITY_MIN_ERROR'],
            max: [50, 'MEMBER_CAPACITY_MAX_ERROR']
        },
        memberList: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            joinedAt: { type: Date, default: Date.now }
        }]
    }, {
        _id: false
    }
);

const addressSchema = new mongoose.Schema(
    {
        state: { type: String, required: true },
        city: { type: String, required: true },
        detail: { type: String, default: null }
    }, {
        _id: false
    }
);

const scheduleSchema = new mongoose.Schema(
    {
        title: { type: String, default: "정기 모임" },
        date: { type: Date, required: true },
        address: { type: addressSchema, required: true },
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        status: {
            type: String, 
            enum: ['모집', '마감', '종료', '취소'], 
            default: '모집' 
        }
    }, {
        _id: false
    }
);

const regularCrewSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        intro: { type: String },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        member: { type: memberSchema, required: true },
        isAutoAccept: { type: Boolean, default: true },
        period: {
            type: String,
            enum: ['week', '2week', 'month'],
            default: 'week'
        },
        day: {
            type: [String], 
            enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'none'],
            default: ['none']
        },
        schedule: { type: scheduleSchema, default: [] },
        ageRange: {
            type: [String],
            enum: ['all', '10s', '20s', '30s', '40s', '50s', '60+'],
            default: ['all']
        },
        address: { type: addressSchema, required: true },
        sport: {
            type: String,
            required: true,
            enum: Object.keys(CONSTANTS.SPORTS)
        },
        fee: { type: Number, default: 0 },
        level: {
            type: String,
            enum: ['low', 'mid', 'high', 'none'],
            default: 'none'
        },
        rating: {
            type: Number,
            default: 0,
            min: [0, 'REGULAR_CREW_RATING_MIN_ERROR']
        },
        reputation: { type: Number, default: 0 },
        profileImage: {
            type: String, 
            //여기에 저장하는 파일은 images/user-profile/<userId>-<DateTime>.jpg 형식으로 저장됨
            //폴더나 파일 명은 적절하다고 생각하는 한도에서 사용 
            default: 'default-crew-profile.jpg'
        }
    }, {
        timestamps: true
    }
);

regularCrewSchema.index({ "address.state": 1, "address.city": 1, createdAt: -1 });
regularCrewSchema.index({ "address.city": 1, sport: 1 });
regularCrewSchema.index({ host: 1 });

const regularCrew = mongoose.model('regularCrew', regularCrewSchema);

module.exports = regularCrew;