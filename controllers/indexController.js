const homeService = require('../services/indexService');

exports.getHome = async (req, res, next) => {
    try {
        
        const [regularMeetings, leafletMatches, stats, sportChips, liveFeed] =
        await Promise.all([
            homeService.getRegularMeetings(),
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
            liveFeed

        });

    } catch (err) {
        next(err);
    }
};