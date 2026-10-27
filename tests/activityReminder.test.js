const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Activity = require('../models/crewActivity');
const RegularCrew = require('../models/regularCrew');
const InstantCrew = require('../models/instantCrew');
const Notification = require('../models/notification');
const notiService = require('../services/notiService');
const { sendActivityReminders } = require('../utils/scheduler');

const host = '111111111111111111111111';
const member = '222222222222222222222222';
const outsider = '333333333333333333333333';
const crewId = '444444444444444444444444';
const activityId = '555555555555555555555555';
const now = new Date('2026-10-26T14:50:00Z');
const startTime = new Date('2026-10-26T15:05:00Z');
const location = { state: '서울', city: '도봉구', detail: '체육관' };

function activity(values = {}) {
    return {
        _id: activityId,
        crewId,
        crewModel: 'regular',
        title: '정기 풋살',
        startTime,
        status: '모집',
        location,
        teamBlue: [host, member],
        teamRed: [member],
        ...values
    };
}

function instant(values = {}) {
    return {
        _id: crewId,
        title: '번개 볼링',
        host,
        meetAt: startTime,
        address: location,
        member: {
            memberList: [
                { user: host, status: 'confirmed' },
                { user: member, status: 'confirmed' },
                { user: outsider, status: 'noshow' }
            ]
        },
        ...values
    };
}

function setup(t, activities = [], crews = [], owner = { host }) {
    const saved = [];
    const emitted = [];
    const keys = new Set();

    t.mock.method(Activity, 'find', async (query) => {
        assert.equal(query.crewModel, 'regular');
        assert.deepEqual(query.status.$in, ['모집', '마감']);
        return activities.filter(act =>
            act.crewModel === query.crewModel &&
            query.status.$in.includes(act.status) &&
            act.startTime > query.startTime.$gt && act.startTime <= query.startTime.$lte
        );
    });
    t.mock.method(RegularCrew, 'findById', () => ({
        select: () => ({ lean: async () => owner })
    }));
    t.mock.method(InstantCrew, 'find', async (query) => crews.filter(crew =>
        crew.meetAt > query.meetAt.$gt && crew.meetAt <= query.meetAt.$lte
    ));
    t.mock.method(Notification, 'init', async () => {});
    t.mock.method(Notification.prototype, 'save', async function () {
        await this.validate();
        if (keys.has(this.reminderKey)) {
            throw Object.assign(new Error('duplicate reminder'), {
                code: 11000,
                keyPattern: { reminderKey: 1 }
            });
        }
        keys.add(this.reminderKey);
        saved.push(this);
        return this;
    });

    const io = {
        of(namespace) {
            assert.equal(namespace, '/noti');
            return {
                to(room) {
                    return {
                        emit(event, noti) { emitted.push({ room, event, noti }); }
                    };
                }
            };
        }
    };
    return { saved, emitted, io };
}

test('regular reminder saves valid system notifications and emits once per participant including host', async t => {
    const { saved, emitted, io } = setup(t, [activity()]);
    await sendActivityReminders(io, now);

    assert.deepEqual(saved.map(noti => String(noti.receiver)), [host, member]);
    assert.equal(emitted.length, 2);
    for (const noti of saved) {
        assert.equal(noti.sender, null);
        assert.equal(noti.event, 'ACTIVITY_REMINDER');
        assert.match(noti.title, /^15분 후/);
        assert.equal(noti.route, `/regular/${crewId}/attendance/day/2026-10-27?activity=${activityId}`);
    }
    assert.equal(emitted[0].room, `user:${host}`);
});

test('instant reminder includes host and confirmed members and excludes noshows', async t => {
    const { saved, io } = setup(t, [], [instant()]);
    await sendActivityReminders(io, now);
    assert.deepEqual(saved.map(noti => String(noti.receiver)), [host, member]);
    assert.equal(saved[0].route, `/instant/${crewId}/attendance`);
});

test('reminder window excludes started, distant and ended meetings and deleted regular crews', async t => {
    const past = new Date(now.getTime() - 1000);
    const distant = new Date(startTime.getTime() + 1);
    const { saved } = setup(t, [
        activity({ startTime: now }),
        activity({ startTime: past }),
        activity({ startTime: distant }),
        activity({ status: '종료' }),
        activity()
    ], [instant({ meetAt: now }), instant({ meetAt: distant })], null);
    await sendActivityReminders(null, now);
    assert.equal(saved.length, 0);
});

test('repeated and concurrent scheduler runs do not store or emit duplicate reminders', async t => {
    const { saved, emitted, io } = setup(t, [activity()], [instant()]);
    await Promise.all([sendActivityReminders(io, now), sendActivityReminders(io, now)]);
    await sendActivityReminders(io, new Date(now.getTime() + 60000));
    assert.equal(saved.length, 4);
    assert.equal(emitted.length, 4);
    assert.equal(new Set(saved.map(noti => noti.reminderKey)).size, 4);
});

test('rescheduled activity receives a new reminder and offline users still have stored notifications', async t => {
    const meeting = activity();
    const { saved, emitted } = setup(t, [meeting]);
    await sendActivityReminders(null, now);
    meeting.startTime = new Date(startTime.getTime() - 60000);
    await sendActivityReminders(null, now);
    assert.equal(saved.length, 4);
    assert.equal(emitted.length, 0);
    assert.notEqual(saved[0].reminderKey, saved[2].reminderKey);
    assert.match(saved[2].title, /^14분 후/);
});

test('failed recipient is retried without resending successful recipients', async t => {
    const { saved, emitted, io } = setup(t, [activity()]);
    const create = notiService.createReminderNoti;
    let failed = false;
    t.mock.method(console, 'error', () => {});
    t.mock.method(notiService, 'createReminderNoti', async data => {
        if (data.receiver === member && !failed) {
            failed = true;
            throw new Error('temporary DB error');
        }
        return create(data);
    });
    await sendActivityReminders(io, now);
    assert.equal(saved.length, 1);
    await sendActivityReminders(io, now);
    assert.equal(saved.length, 2);
    assert.equal(emitted.length, 2);
});

test('deduplication index preserves existing notifications and unrelated errors are not swallowed', async t => {
    const index = Notification.schema.indexes().find(([fields]) => fields.reminderKey);
    assert.equal(index[1].unique, true);
    assert.equal(index[1].sparse, true);
    t.mock.method(Notification, 'init', async () => {});
    const error = Object.assign(new Error('other duplicate'), { code: 11000, keyPattern: { other: 1 } });
    t.mock.method(Notification.prototype, 'save', async () => { throw error; });
    await assert.rejects(notiService.createReminderNoti({ receiver: host }), error);
});

test('attendance and reminder notifications navigate to QR attendance without requesting GPS', () => {
    const source = fs.readFileSync(require.resolve('../public/js/modules/notiRender.js'), 'utf8');
    const nodes = new Map();
    const listeners = new Map();
    const item = {
        querySelector(selector) {
            if (!nodes.has(selector)) {
                nodes.set(selector, { addEventListener: (event, handler) => listeners.set(selector, handler) });
            }
            return nodes.get(selector);
        },
        addEventListener(event, handler) { listeners.set(event, handler); }
    };
    const window = { location: { href: '' } };
    const context = {
        window,
        document: { createElement: () => item },
        navigator: { geolocation: { getCurrentPosition() { throw new Error('Unexpected GPS request'); } } }
    };
    vm.createContext(context);
    vm.runInContext(source.replace(/export /g, ''), context);
    const list = { querySelector: () => null, appendChild() {} };

    for (const event of ['ACTIVITY_REMINDER', 'ACTIVITY_ATTEND']) {
        context.renderNoti({
            _id: 'notice',
            event,
            createdAt: new Date(),
            route: `/instant/${crewId}/attendance`,
            title: '<img src=x onerror=alert(1)>',
            content: '<b>장소</b>'
        }, list);
        listeners.get('click')();
        assert.equal(window.location.href, `/instant/${crewId}/attendance`);
        assert.equal(nodes.get('.noti-title strong').textContent, '<img src=x onerror=alert(1)>');
        assert.equal(nodes.get('.noti-meta').textContent, '<b>장소</b>');
        assert.ok(!item.innerHTML.includes('<img'));
    }
});
