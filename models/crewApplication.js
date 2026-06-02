const mongoose = require('mongoose');

const crewApplicationSchema = new mongoose.Schema(
    {
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
            ref: 'User'
        },
        crewId: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
            refPath: 'crewType'
        },
        crewType: {
            type: String,
            required: true,
            enum: ['regularCrew', 'instantCrew']
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        }
    }, {
        timestamps: true
    }
);

crewApplicationSchema.index({ crewId: 1, createdAt: -1 });
crewApplicationSchema.index({ userId: 1, createdAt: -1 });
crewApplicationSchema.index({ crewId: 1, userId: 1 }, { unique: true });

const crewApplication = mongoose.model('crewApplication', crewApplicationSchema);

module.exports = crewApplication;