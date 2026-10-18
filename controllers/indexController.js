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
        const [aiMeetings, leafletMatches, stats, sportChips, liveFeed] =
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
            ? await homeService.getMyStats(req.user._id)
            : null;

        res.render('index', {
            featuredMeetings: aiMeetings.featured,   // 왼쪽 캐러셀 (10개)
            gridMeetings: aiMeetings.grid,           // 오른쪽 그리드 (40개)
            // 현재 index.ejs용 임시값 (전체 50개). 팀원 뷰와 합친 뒤 삭제
            regularMeetings: [...aiMeetings.featured, ...aiMeetings.grid],
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