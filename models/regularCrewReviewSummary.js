const mongoose = require('mongoose');

const reviewPointSchema = new mongoose.Schema(
    {
        topic: { type: String, required: true },
        detail: { type: String, required: true },
        evidenceReviewIds: { type: [String], default: [] }
    },
    { _id: false }
);

const regularCrewReviewSummarySchema = new mongoose.Schema(
    {
        crew: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'regularCrew',
            required: true,
            unique: true
        },
        sourceHash: { type: String, required: true },
        cacheVersion: { type: Number, required: true },
        model: { type: String, required: true },
        reviewCount: { type: Number, required: true },
        averageScore: { type: Number, required: true },
        summary: { type: String, required: true },
        sentiment: {
            type: String,
            enum: ['positive', 'mixed', 'negative'],
            required: true
        },
        pros: { type: [reviewPointSchema], default: [] },
        cons: { type: [reviewPointSchema], default: [] },
        keywords: { type: [String], default: [] },
        caution: { type: String, default: '' },
        generatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    'regularCrewReviewSummary',
    regularCrewReviewSummarySchema
);
