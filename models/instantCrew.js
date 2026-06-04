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
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            role: { 
                type: String, 
                enum: ['host', 'member'],
                default: 'member'
            },
            status: {
                type: String,
                enum: ['confirmed', 'noshow'],
                default: 'confirmed'
            },
            joinedAt: { type: Date, default: Date.now }
        }]
    }, {
        _id: false
    }
);

const locationSchema = new mongoose.Schema(
    {
        state: { type: String, required: true },
        city: { type: String, required: true },
        detail: { type: String, default: ''},
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    }, {
        _id: false
    }
);

const instantCrewSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        intro: { type: String },
        meetAt: {
            type: Date,
            required: true
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        member: { type: memberSchema, required: true },
        isAutoAccept: { type: Boolean, default: true },
        address: { type: locationSchema, required: true },
        sport: {
            type: String,
            required: true,
            enum: SPORTS_EN
        },
        avgReputation: { type: Number, default: 0 }
    }, {
        timestamps: true
    }
);

instantCrewSchema.index({ "address.state": 1, "address.city": 1, createdAt: -1 });
instantCrewSchema.index({ "address.city": 1, sport: 1 });
instantCrewSchema.index({ "address.lat": 1, "address.lng": 1 });
instantCrewSchema.index({ host: 1 });

const instantCrew = mongoose.model('instantCrew', instantCrewSchema);

module.exports = instantCrew;
