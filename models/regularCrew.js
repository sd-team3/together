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
            type: addressSchema,
            required: true
        },
        sport: {
            type: String,
            required: true,
            enum: SPORTS_EN
        },
        rating: {
            type: Number,
            default: 0,
            min: [0, 'REGULAR_CREW_RATING_MIN_ERROR']
        },
        reputation: {
            type: Number,
            default: 0
        }
    }
);