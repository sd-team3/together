// models/regularCrewReview.js
const mongoose = require('mongoose');

const regularCrewReviewSchema = new mongoose.Schema(
    {
        crew: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'regularCrew',
            required: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        score: {
            type: Number,
            required: true,
            min: [0.5, 'REVIEW_SCORE_MIN_ERROR'],
            max: [5, 'REVIEW_SCORE_MAX_ERROR']
        },
        title: { type: String, required: true },
        content: { type: String, required: true },
        images: {
            type: [String],
            default: []
            
        }
    },
    {
        timestamps: true
    }
);

regularCrewReviewSchema.index({ crew: 1, createdAt: -1 });

const regularCrewReview = mongoose.model('regularCrewReview', regularCrewReviewSchema);

module.exports = regularCrewReview;