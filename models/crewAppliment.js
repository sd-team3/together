const mongoose = require('mongoose');

const crewApplimentSchema = new mongoose.Schema(
    {
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
            ref: 'User'
        },
        crew: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
            refPath: 'crewType'
        },
        crewType: {
            type: String,
            required: true,
            enum: ['RegularCrew', 'instantCrew']
        },
        content: { type: String }
    }, {
        timestamps: true
    }
);

crewApplimentSchema.index({ crew: 1, createdAt: -1 });
crewApplimentSchema.index({ user: 1, createdAt: -1 });
crewApplimentSchema.index({ crew: 1, user: 1 }, {unique: true});

const crewAppliment = mongoose.model('crewAppliment', crewApplimentSchema);

module.exports = crewAppliment;