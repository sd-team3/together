const express = require('express');
const requestValidation = require('../middlewares/requestValidation');
const { randomBytes } = require('node:crypto');
const Subscription = require('../models/webPushSubscription');
const { deviceCookie, deviceFromRequest, vapidDetails, validSubscription } = require('../services/webPushService');

const router = express.Router();

router.use(
    requestValidation.noStore,
    requestValidation.webPushLoginValidation,
    requestValidation.webPushRequestValidation
);

router.get('/', async (req, res) => {
    const publicKey = vapidDetails()?.publicKey;
    const device = deviceFromRequest(req);
    const enabled = Boolean(device && await Subscription.exists({ _id: device, user: req.user._id }));
    res.json({ publicKey: publicKey || null, enabled });
});

router.put('/', async (req, res) => {
    if (!vapidDetails()) return res.status(503).json({ message: '휴대폰 알림이 설정되지 않았습니다.' });
    if (!validSubscription(req.body)) return res.status(400).json({ message: '올바르지 않은 알림 구독입니다.' });

    const { endpoint, keys: { p256dh, auth } } = req.body;
    await Subscription.init();
    // A browser can retain its subscription after its device cookie is cleared.
    const existing = await Subscription.findOne({ endpoint, 'keys.auth': auth }).select('_id').lean();
    const device = existing?._id || deviceFromRequest(req) || randomBytes(32).toString('hex');
    try {
        await Subscription.updateOne(
            { _id: device },
            { $set: { endpoint, user: req.user._id, keys: { p256dh, auth } } },
            { upsert: true }
        );
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: '설정을 새로고침하고 다시 시도해주세요.' });
        throw error;
    }
    res.cookie(deviceCookie, device, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        secure: true
    });
    res.sendStatus(204);
});

router.delete('/', async (req, res) => {
    const device = deviceFromRequest(req);
    if (device) await Subscription.deleteOne({ _id: device, user: req.user._id });
    res.sendStatus(204);
});

module.exports = router;
