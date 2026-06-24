const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
    {
        state: { type: String, required: true },
        city: { type: String, required: true },
        detail: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    }, {
        _id: false
    }
);

const crewActivitySchema = new mongoose.Schema(
    {
        crewModel: { 
            type: String,
            required: true, 
            enum: ['regular', 'instant'] 
        },
        crewId: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            refPath: 'crewModel'
        },
        title: { type: String, required: true },
        content: { type: String, default: "" },
        startTime: { type: Date, required: true },
        endTime: { type: Date, default: null },
        location: { type: locationSchema, required: true },
        gameType: { type: String, enum: ['solo', 'team'], default: 'solo' },
        teamBlue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        teamRed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        attender: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        capacity: { type: Number, required: true },
        status: {
            type: String, 
            enum: ['모집', '마감', '활동','종료'], 
            default: '모집' 
        }
    }, {
        timestamps: true
    }
);

crewActivitySchema.virtual('participants').get(function() {
    return this.gameType === 'solo' ? this.teamBlue : [];
});
crewActivitySchema.set('toJSON', { virtuals: true });

const crewActivity = mongoose.model('crewActivity', crewActivitySchema);

module.exports = crewActivity;
