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
        count: {
            type: Number,
            default: 1
        },
        memberList: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }, {
        _id: false
    }
);

const LocationSchema = new mongoose.Schema(
    {
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    }, {
        _id: false
    }
);

const instantCrewSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
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
        address: {
            type: LocationSchema,
            required: true
        },
        sport: {
            type: String,
            required: true,
            enum: SPORTS_EN
        },
        avgReputation: {
            type: Number,
            default: 0
        }
    }
);

const instantCrew = mongoose.model('instantCrew', instantCrewSchema);

module.exports = instantCrew;