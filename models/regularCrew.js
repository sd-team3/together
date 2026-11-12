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
        detail: { type: String, default: ''}
    }, {
        _id: false
    }
);

const regularCrewSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        intro: { type: String },
        introBlocks: [{
            _id: false,
            type: { type: String, enum: ['text', 'image'], required: true },
            text: String,
            src: String
        }],
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
            default: 'default-crew-profile.jpg'
        },
        likedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }, {
        timestamps: true
    }
);

regularCrewSchema.index({ "address.state": 1, "address.city": 1, createdAt: -1 });
regularCrewSchema.index({ "address.city": 1, sport: 1 });
regularCrewSchema.index({ host: 1 });

const regularCrew = mongoose.model('regularCrew', regularCrewSchema);

module.exports = regularCrew;
