const crypto = require('crypto');
const regularCrewReviewSummary = require('../../models/regularCrewReviewSummary');
const { summarizeReviews } = require('./reviewSummaryService');

const CACHE_VERSION = 1;
const inFlightSummaries = new Map();

function createReviewSourceHash(reviews) {
    const source = reviews
        .map(review => ({
            id: review._id.toString(),
            score: Number(review.score),
            content: String(review.content || '').trim(),
            updatedAt: review.updatedAt ? new Date(review.updatedAt).toISOString() : null
        }))
        .sort((left, right) => left.id.localeCompare(right.id));

    return crypto
        .createHash('sha256')
        .update(JSON.stringify(source))
        .digest('hex');
}

function toSummaryResponse(cacheDocument) {
    return {
        reviewCount: cacheDocument.reviewCount,
        averageScore: cacheDocument.averageScore,
        summary: cacheDocument.summary,
        sentiment: cacheDocument.sentiment,
        pros: cacheDocument.pros,
        cons: cacheDocument.cons,
        keywords: cacheDocument.keywords,
        caution: cacheDocument.caution
    };
}

async function createAndCacheSummary(crewId, reviews, sourceHash) {
    const cached = await regularCrewReviewSummary.findOne({
        crew: crewId,
        sourceHash,
        cacheVersion: CACHE_VERSION
    }).lean();

    if (cached) {
        return {
            summary: toSummaryResponse(cached),
            cacheHit: true
        };
    }

    const summary = await summarizeReviews(reviews);
    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

    try {
        await regularCrewReviewSummary.findOneAndUpdate(
            { crew: crewId },
            {
                $set: {
                    sourceHash,
                    cacheVersion: CACHE_VERSION,
                    model,
                    ...summary,
                    generatedAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );
    } catch (error) {
        console.error('AI 후기 요약 캐시 저장 오류:', error.message);
    }

    return {
        summary,
        cacheHit: false
    };
}

async function getOrCreateReviewSummary(crewId, reviews) {
    const sourceHash = createReviewSourceHash(reviews);
    const requestKey = `${crewId.toString()}:${sourceHash}:${CACHE_VERSION}`;

    if (inFlightSummaries.has(requestKey)) {
        return inFlightSummaries.get(requestKey);
    }

    const summaryPromise = createAndCacheSummary(crewId, reviews, sourceHash);
    inFlightSummaries.set(requestKey, summaryPromise);

    try {
        return await summaryPromise;
    } finally {
        inFlightSummaries.delete(requestKey);
    }
}

module.exports = {
    CACHE_VERSION,
    createReviewSourceHash,
    getOrCreateReviewSummary
};
