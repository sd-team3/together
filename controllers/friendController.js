const friendService = require('../services/friendService');

const getFriendList = async (req, res) => {
    try {
        const [friends, pendingRequests] = await Promise.all([
            friendService.getFriendList(req.user._id),
            friendService.getPendingRequests(req.user._id)
        ]);
        res.render('friend/friend', { friends, pendingRequests });
    } catch (err) {
        console.error('getFriendList:', err);
        res.status(500).send('서버 오류');
    }
};

const removeFriend = async (req, res) => {
    try {
        await friendService.removeFriend(req.user._id, req.params.friendId);
        res.json({ ok: true });
    } catch (err) {
        console.error('removeFriend:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
};

const toggleFavorite = async (req, res) => {
    try {
        const isFavorite = await friendService.toggleFavorite(req.user._id, req.params.friendId);
        res.json({ ok: true, isFavorite });
    } catch (err) {
        console.error('toggleFavorite:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
};

module.exports = { getFriendList, removeFriend, toggleFavorite };