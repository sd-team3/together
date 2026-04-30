const mongoose = require('mongoose');

const crewApplimentSchema = new mongoose.Schema(
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
            enum: ['RegularCrew', 'instantCrew']
        }
    }, {
        timestamps: true
    }
);

crewApplimentSchema.index({ crewId: 1, createdAt: -1 });
crewApplimentSchema.index({ userId: 1, createdAt: -1 });
crewApplimentSchema.index({ crewId: 1, userId: 1 }, {unique: true});

const crewAppliment = mongoose.model('crewAppliment', crewApplimentSchema);

module.exports = crewAppliment;