const webPush = require('web-push');
const Subscription = require('../models/webPushSubscription');

const deviceCookie = 'togetherPushDevice';

function deviceFromRequest(req) {
    return req.get('cookie')?.match(/(?:^|;\s*)togetherPushDevice=([a-f0-9]{64})(?:;|$)/)?.[1];
}

function vapidDetails() {
    const subject = process.env.VAPID_SUBJECT || process.env.PUBLIC_BASE_URL;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (subject && publicKey && privateKey) return { subject, publicKey, privateKey };
}

function validEndpoint(endpoint) {
    if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
    try {
        const url = new URL(endpoint);
        // Only known browser push services may receive server-side requests.
        const hostAllowed = url.hostname === 'fcm.googleapis.com' ||
            url.hostname === 'updates.push.services.mozilla.com' ||
            url.hostname.endsWith('.push.apple.com');
        return hostAllowed && url.protocol === 'https:' &&
            !url.port && !url.username && !url.password && !url.hash &&
            url.pathname !== '/';
    } catch {
        return false;
    }
}

function validSubscription(subscription) {
    return validEndpoint(subscription?.endpoint) &&
        typeof subscription.keys?.p256dh === 'string' &&
        /^[A-Za-z0-9_-]{87}$/.test(subscription.keys.p256dh) &&
        typeof subscription.keys?.auth === 'string' &&
        /^[A-Za-z0-9_-]{22}$/.test(subscription.keys.auth);
}

async function sendNotification(notification, expiresAt) {
    const details = vapidDetails();
    if (!details) return;
    try {
        const subscriptions = await Subscription.find({ user: notification.receiver }).lean();
        const ttl = expiresAt ? Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) : 86400;
        if (ttl <= 0) return;

        const payload = JSON.stringify({
            id: String(notification._id),
            title: notification.title,
            body: notification.content,
            route: notification.route
        });
        await Promise.all(subscriptions.map(async ({ _id, endpoint, keys }) => {
            if (!validEndpoint(endpoint)) return;
            try {
                await webPush.sendNotification({ endpoint, keys }, payload, {
                    vapidDetails: details,
                    TTL: ttl,
                    timeout: 5000
                });
            } catch (error) {
                if ([404, 410].includes(error.statusCode)) {
                    await Subscription.deleteOne({ _id, endpoint, user: notification.receiver, keys });
                } else {
                    console.error('[휴대폰 알림 전송 실패]', error.statusCode || error.name);
                }
            }
        }));
    } catch (error) {
        console.error('[휴대폰 알림 처리 실패]', error.name);
    }
}

module.exports = { deviceCookie, deviceFromRequest, vapidDetails, validSubscription, sendNotification };
