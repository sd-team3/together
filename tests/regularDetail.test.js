const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');
const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');
const regularService = require('../services/crew/regularService');
const activityService = require('../services/crew/activityService');
const applicationService = require('../services/crew/applicationService');
const crewService = require('../services/crew/crewService');
const controller = require('../controllers/crew/regularController');
const activityController = require('../controllers/crew/activityController');
const middleware = require('../middlewares/crewMiddleware');
const Activity = require('../models/crewActivity');

const host = '111111111111111111111111';
const member = '222222222222222222222222';
const outsider = '333333333333333333333333';
const crewId = '444444444444444444444444';
const crew = {
    _id: crewId, title: '테스트 모임', intro: '모임 소개',
    host: { _id: host, name: '모임장' },
    member: { capacity: 10, memberList: [
        { user: { _id: host, name: '모임장', age: 30 }, joinedAt: new Date() },
        { user: { _id: member, name: '모임원', age: 25 }, joinedAt: new Date() }
    ] },
    address: { state: '서울', city: '강남구', detail: '운동장' },
    day: ['sat'], ageRange: ['all'], reputation: 0, likedBy: []
};
const pendingApps = [{ _id: 'application', userId: { _id: outsider, name: '가입대기자', age: 20 } }];
const activity = {
    _id: 'activity', title: '주말 운동', startTime: new Date('2099-01-01T10:00:00+09:00'),
    endTime: new Date('2099-01-01T12:00:00+09:00'), status: '모집',
    capacity: 5, gameType: 'solo', teamBlue: [], teamRed: [], location: crew.address
};
function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        send(body) { this.body = body; return this; },
        render(view, data) { this.view = view; this.data = data; },
        redirect(url) { this.url = url; }
    };
}

for (const userId of [null, outsider, member, host]) {
    test('detail tabs and controls reflect role: ' + userId, async () => {
        const html = await ejs.renderFile(path.join(__dirname, '../views/crew/regular-join-page.ejs'), {
            crew, userId, user: userId ? { _id: userId, name: '사용자' } : null,
            reviews: [], acts: [activity], pendingApps, CONSTANTS, isLiked: false
        });
        const joined = userId === host || userId === member;
        assert.equal(html.includes('id="panel-schedule"'), joined);
        assert.equal(html.includes('id="panel-members"'), joined);
        assert.equal(html.includes('id="addScheduleForm"'), userId === host);
        assert.equal(html.includes('data-application-action="accept"'), userId === host);
        assert.equal(html.includes('data-application-action="reject"'), userId === host);
        assert.equal(html.includes('class="kick-btn"'), userId === host);
        assert.equal(html.includes('가입대기자'), userId === host);
        assert.equal(html.includes('내가 참여한 모임'), false);
        assert.equal(html.includes('id="timetable"'), false);
        if (joined) {
            const schedule = html.slice(html.indexOf('id="panel-schedule"'), html.indexOf('id="panel-members"'));
            assert.ok(schedule.includes('참가 신청'));
            assert.equal(schedule.includes('일정 추가'), false);
            assert.equal(schedule.includes('toggleAddForm'), false);
            assert.ok(html.includes(`onclick="openProfileModal('${member}')"`));
        }
        // Check generated classic scripts too, including interpolated EJS values.
        for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
            if (/type="(?:module|application\/json)"/.test(match[1])) continue;
            new Function(match[2]);
        }
    });

    test('controller only loads joined activities and owner applications: ' + userId, async t => {
        t.mock.method(regularService, 'getCrewDetail', async () => crew);
        t.mock.method(regularService, 'getCrewReview', async () => []);
        const acts = t.mock.method(activityService, 'findActsByCrewId', async () => [activity]);
        const applications = t.mock.method(applicationService, 'findPendingAppsByCrewId', async () => pendingApps);
        const res = response();
        await controller.getRegularPage({ params: { crewId }, user: userId ? { _id: userId } : null, isAuthenticated: () => Boolean(userId) }, res, error => { throw error; });
        assert.equal(res.view, 'crew/regular-join-page');
        assert.equal(acts.mock.callCount(), userId === host || userId === member ? 1 : 0);
        assert.equal(applications.mock.callCount(), userId === host ? 1 : 0);
        assert.equal(res.data.pendingApps.length, userId === host ? 1 : 0);
    });
}

test('schedule disables joined, full, started and closed activities', async () => {
    for (const state of ['open', 'entered', 'full', 'started', 'closed']) {
        const act = { ...activity,
            teamBlue: state === 'entered' ? [{ _id: member }] : [],
            capacity: state === 'full' ? 0 : 5,
            startTime: state === 'started' ? new Date(0) : activity.startTime,
            status: state === 'closed' ? '종료' : '모집'
        };
        const html = await ejs.renderFile(path.join(__dirname, '../views/crew/partials/crew-schedule.ejs'), { acts: [act], currentUserId: member });
        assert.equal(html.includes(' disabled>'), state !== 'open', state);
    }
});

test('solo application counts each participant once and persists to teamBlue', async () => {
    const act = new Activity({ ...activity, _id: new mongoose.Types.ObjectId(), crewId, crewModel: 'regular', teamBlue: [host], capacity: 3 });
    let saved = false;
    act.save = async () => { saved = true; };
    const res = response();
    await activityController.postEntry({ activity: act, user: { _id: member } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.deepEqual(act.teamBlue.map(String), [host, member]);
    assert.equal(act.status, '모집');
});

test('team applications balance teams and close on the final slot', async () => {
    const act = new Activity({ ...activity, _id: new mongoose.Types.ObjectId(), crewId, crewModel: 'regular', gameType: 'team', teamRed: [host], capacity: 2 });
    act.save = async () => {};
    const res = response();
    await activityController.postEntry({ activity: act, user: { _id: member } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(act.teamBlue.map(String), [member]);
    assert.equal(act.status, '마감');
});

test('server rejects duplicate, full, started and closed applications', async () => {
    for (const state of ['entered', 'full', 'started', 'closed']) {
        let saved = false;
        const act = { ...activity,
            teamBlue: state === 'entered' ? [member] : [],
            capacity: state === 'full' ? 0 : 5,
            startTime: state === 'started' ? new Date(0) : activity.startTime,
            status: state === 'closed' ? '종료' : '모집',
            save: async () => { saved = true; }
        };
        const res = response();
        await activityController.postEntry({ activity: act, user: { _id: member } }, res);
        assert.equal(res.statusCode, 400, state);
        assert.equal(saved, false, state);
    }
});

test('membership guard rejects guests and outsiders', async t => {
    const lookup = t.mock.method(crewService, 'userInCrew', async () => false);
    for (const userId of [null, outsider]) {
        const res = response();
        await middleware.isMember({ params: { crewId }, isAuthenticated: () => Boolean(userId), user: userId ? { _id: userId } : null }, res, () => assert.fail('must not allow access'));
        assert.equal(res.statusCode, userId ? 403 : 401);
    }
    assert.equal(lookup.mock.callCount(), 1);
});

test('removed page URLs redirect to the canonical list and detail', () => {
    const router = require('../routes/crew/regularRouter');
    for (const [url, target] of [['/my', '/regular/list'], ['/manage/:crewId', `/regular/list/${crewId}`]]) {
        const route = router.stack.find(layer => layer.route?.path === url).route;
        const res = response();
        route.stack[0].handle({ params: { crewId } }, res);
        assert.equal(res.url, target);
    }
});
