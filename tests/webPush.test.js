const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const express = require('express');
const mongoose = require('mongoose');
const webPush = require('web-push');
const Subscription = require('../models/webPushSubscription');
const pushService = require('../services/webPushService');
const application = require('../controllers/crew/applicationController');
const applicationService = require('../services/crew/applicationService');
const crewService = require('../services/crew/crewService');
const chatService = require('../services/chatService');
const notiService = require('../services/notiService');
const webPushRouter = require('../routes/webPushRouter');

function configureVapid(t) {
    const keys = webPush.generateVAPIDKeys();
    const settings = {
        VAPID_SUBJECT: 'https://example.org',
        VAPID_PUBLIC_KEY: keys.publicKey,
        VAPID_PRIVATE_KEY: keys.privateKey
    };
    for (const [name, value] of Object.entries(settings)) {
        const previous = process.env[name];
        process.env[name] = value;
        t.after(() => {
            if (previous === undefined) delete process.env[name];
            else process.env[name] = previous;
        });
    }
    return keys.publicKey;
}

test('regular and instant approvals push the saved notification after commit', async (t) => {
    const calls = [];
    t.mock.method(mongoose, 'startSession', async () => ({
        startTransaction() {},
        commitTransaction() { calls.push('commit'); },
        endSession() {}
    }));
    t.mock.method(applicationService, 'appStatusUpdateById', async () => ({ userId: 'applicant', crewId: 'crew' }));
    t.mock.method(crewService, 'addUserToCrew', async () => true);
    t.mock.method(crewService, 'addCrewToUser', async () => true);
    t.mock.method(chatService, 'addMemberToChatRoom', async () => {});
    t.mock.method(notiService, 'createNoti', async noti => noti);
    t.mock.method(pushService, 'sendNotification', async noti => calls.push(['push', noti]));

    for (const [modelName, path] of [['regularCrew', 'regular'], ['instantCrew', 'instant']]) {
        calls.length = 0;
        const io = { of: () => ({ to: () => ({ emit: () => calls.push('socket') }) }) };
        const req = {
            params: { appId: 'application', action: 'accept' },
            user: { _id: 'host' },
            crew: { title: '모임' },
            crewModel: { modelName },
            app: { get: () => io }
        };
        const res = { status(code) { assert.equal(code, 200); return this; }, json() {} };
        await application.joinProcess(req, res);
        assert.deepEqual(calls.slice(0, 2), ['commit', 'socket']);
        const [delivery, notification] = calls[2];
        assert.equal(delivery, 'push');
        assert.equal(notification.receiver, 'applicant');
        assert.equal(notification.event, 'APPLICATION_ACCEPTED');
        assert.equal(notification.route, `/${path}/list/crew`);
    }
});

test('push expires with the meeting, uses only trusted providers and removes expired subscriptions', async (t) => {
    configureVapid(t);
    const browserKeys = { p256dh: webPush.generateVAPIDKeys().publicKey, auth: Buffer.alloc(16).toString('base64url') };
    const expired = { _id: 'device', endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: browserKeys };
    const invalid = { _id: 'other', endpoint: 'https://fcm.googleapis.com.example.org/send/abc', keys: browserKeys };
    const requests = [];
    const removed = [];
    t.mock.method(Subscription, 'find', filter => {
        assert.deepEqual(filter, { user: 'member' });
        return { lean: async () => [expired, invalid] };
    });
    t.mock.method(Subscription, 'deleteOne', async filter => removed.push(filter));
    t.mock.method(https, 'request', (options, callback) => {
        requests.push(options);
        const request = new EventEmitter();
        request.write = () => {};
        request.end = () => {
            const response = Object.assign(new EventEmitter(), { statusCode: 410, headers: {} });
            callback(response);
            response.emit('end');
        };
        return request;
    });

    assert.equal(pushService.validSubscription(expired), true);
    assert.equal(pushService.validSubscription(invalid), false);
    const notification = { _id: 'noti', receiver: 'member', title: '곧 시작해요', route: '/attendance' };
    await pushService.sendNotification(notification, Date.now() - 1000);
    assert.equal(requests.length, 0);
    await pushService.sendNotification(notification, Date.now() + 15000);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].hostname, 'fcm.googleapis.com');
    assert.ok(requests[0].headers.TTL > 0 && requests[0].headers.TTL <= 15);
    assert.deepEqual(removed, [{ ...expired, user: 'member' }]);
});

test('only the signed-in account can manage its device subscription', async (t) => {
    const publicKey = configureVapid(t);
    const user = '111111111111111111111111';
    const device = 'a'.repeat(64);
    const payload = {
        endpoint: 'https://web.push.apple.com/example',
        keys: { p256dh: publicKey, auth: Buffer.alloc(16).toString('base64url') }
    };
    t.mock.method(Subscription, 'init', async () => {});
    t.mock.method(Subscription, 'findOne', () => ({ select: () => ({ lean: async () => null }) }));
    t.mock.method(Subscription, 'updateOne', async (filter, update, options) => {
        assert.deepEqual(filter, { _id: device });
        assert.deepEqual(update.$set, { ...payload, user });
        assert.equal(options.upsert, true);
    });
    t.mock.method(Subscription, 'deleteOne', async filter => assert.deepEqual(filter, { _id: device, user }));

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = req.get('X-Test-User') ? { _id: user } : null;
        req.isAuthenticated = () => Boolean(req.user);
        next();
    });
    app.use('/push', webPushRouter);
    const server = await new Promise(resolve => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/push`;
    const headers = {
        'X-Test-User': '1',
        'X-Together-Push': '1',
        'Content-Type': 'application/json',
        Cookie: `togetherPushDevice=${device}`
    };
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' },
        body: JSON.stringify(payload)
    })).status, 403);
    const saved = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
    assert.equal(saved.status, 204);
    assert.match(saved.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
    assert.equal((await fetch(url, { method: 'DELETE', headers, body: '{}' })).status, 204);
});
