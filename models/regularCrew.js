const mongoose = require('mongoose');
const { SPORTS_EN } = require('../config/constants');

const memberSchema = new mongoose.Schema(
    {
        capacity: {
            type: Number,
            required: true,
            min: [1, 'MEMBER_CAPACITY_MIN_ERROR'],
            max: [50, 'MEMBER_CAPACITY_MAX_ERROR']
        },
        memberList: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }, {
        _id: false
    }
);

const addressSchema = new mongoose.Schema(
    {
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        }
    }, {
        _id: false
    }
);

const regularCrewSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        intro: {
            type: String
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        member: {
            type: memberSchema,
            required: true
        },
        period: {
            type: String,
            enum: ['week', '2week', 'month'],
            default: 'week'
        },
        day: {
            type: [String], 
            enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'none']
        },
        ageRange: {
            type: [String],
            enum: ['10s', '20s', '30s', '40s', '50s', '60+'],
            default: ['all']
        },
        address: {
            type: addressSchema,
            required: true
        },
        sport: {
            type: String,
            required: true,
            enum: SPORTS_EN
        },
        fee: {
            type: Number,
            default: 0
        },
        rating: {
            type: Number,
            default: 0,
            min: [0, 'REGULAR_CREW_RATING_MIN_ERROR']
        },
        reputation: {
            type: Number,
            default: 0
        },
        profileImage: {
            type: String, 
            //여기에 저장하는 파일은 images/user-profile/<userId>-<DateTime>.jpg 형식으로 저장됨
            //폴더나 파일 명은 적절하다고 생각하는 한도에서 사용 
            default: 'default-crew-profile.jpg'
        }
    }
);

const regularCrew = mongoose.model('regularCrew', regularCrewSchema);

module.exports = regularCrew;