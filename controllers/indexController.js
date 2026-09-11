const homeService = require('../services/indexService');
const aiSearchService = require('../services/aiSearchService');

exports.aiSearch = async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ ok: true, meetings: [], filter: null });

        const filter = await aiSearchService.parseSearchQuery(q);
        const meetings = await homeService.searchCrewsByAI(filter);
        res.json({ ok: true, meetings, filter });
    } catch (err) {
        next(err);
    }
};

exports.getHome = async (req, res, next) => {
    try {
        
        const [regularMeetings, leafletMatches, stats, sportChips, liveFeed] =
        await Promise.all([
            homeService.getAIRecommendedMeetings(req.user?._id),
            homeService.getLeafletMatches(),
            homeService.getStats(),
            homeService.getSportChips(),
            homeService.getLiveFeed()
    ]);
        stats.activeCount = req.app.locals.activeUserCount || 0;
        
        const mySchedule = req.user
            ? await homeService.getMySchedule(req.user._id)
            : [];

        const myStats = req.user
            ? await homeService.getMyStats(req.user.id)
            : null;

        res.render('index', {
            regularMeetings,
            leafletMatches,
            stats,
            sportChips,
            mySchedule,
            myStats,
            liveFeed,
            isAIRecommended: !!req.user

        });

    } catch (err) {
        next(err);
    }
};

// 정기모임-api
exports.getRegularMeetingsApi = async (req, res, next) => {
    try {
        const sport = req.query.sport || '';
        const meetings = await homeService.getRegularMeetings(sport);
        res.json({ ok: true, meetings });
    } catch (err) {
        next(err);
    }
};