const { test } = require('node:test');
const assert = require('node:assert/strict');
const ejs = require('ejs');
const Activity = require('../models/crewActivity');
const RegularCrew = require('../models/regularCrew');
const InstantCrew = require('../models/instantCrew');
const User = require('../models/User');
const regular = require('../services/crew/attendanceService');
const instant = require('../services/crew/instantAttendanceService');

const [crewId, activityId, host, member] = ['1', '2', '3', '4'].map(value => value.repeat(24));
const start = new Date('2026-11-10T05:00:00Z');
const date = minutes => new Date(start.getTime() + minutes * 60000);
const venue = { lat: 37.5, lng: 127, state: '서울', city: '노원구', detail: '체육관' };
const position = meters => ({ lat: venue.lat + meters / 6371000 * 180 / Math.PI, lng: venue.lng, accuracy: 10 });

function mockWrite(t, model, record) {
    const writes = [];
    const scores = [];
    const session = { withTransaction: callback => callback(), endSession: async () => {} };
    t.mock.method(model, 'startSession', async () => session);
    t.mock.method(model, 'updateOne', async (filter, update, options) => {
        assert.equal(options.session, session);
        assert.equal(filter.attender.$ne, host);
        assert.equal(filter.attendanceRecords.$not.$elemMatch.user, host);
        assert.equal(filter.attendanceQrHash, undefined);
        writes.push(filter);
        record.attender.push(update.$addToSet.attender);
        record.attendanceRecords.push(update.$push.attendanceRecords);
        return { matchedCount: 1 };
    });
    t.mock.method(User, 'updateOne', async (filter, update, options) => {
        assert.deepEqual(filter, { _id: host });
        assert.equal(options.session, session);
        scores.push(update.$inc.honor);
    });
    return { writes, scores };
}

test('regular host needs to be enrolled and within 50m for self check-in', async t => {
    const crew = { host, member: { memberList: [{ user: member }] } };
    const activity = {
        startTime: start, status: '활동', location: venue,
        teamBlue: [member], attender: [], attendanceRecords: []
    };
    t.mock.method(RegularCrew, 'findById', () => ({ lean: async () => crew }));
    t.mock.method(Activity, 'findOne', async () => activity);
    const { writes, scores } = mockWrite(t, Activity, activity);
    const check = (user, coords, now = date(5)) => regular.checkInAsHost(crewId, activityId, user, coords, now);

    await assert.rejects(check(member, position(0)), { status: 403 });
    await assert.rejects(check(host, position(0)), { status: 403 });
    activity.teamBlue.push(host);
    await assert.rejects(check(host, position(0), date(-1)), { status: 409 });
    await assert.rejects(check(host, position(0), date(31)), { status: 409 });
    await assert.rejects(check(host, position(51)), /50m 이내/);
    await assert.rejects(check(host, { ...position(0), accuracy: 51 }), /위치를 정확히/);
    await assert.rejects(check(host, { ...position(0), lat: null }), /위치를 정확히/);
    assert.equal(writes.length, 0);

    assert.deepEqual(await check(host, position(49)), { alreadyAttended: false, attendanceStatus: 'present', scoreDelta: 1 });
    assert.deepEqual(await regular.checkIn(crewId, activityId, host, 'a'.repeat(64), date(6)),
        { alreadyAttended: true, attendanceStatus: 'present', scoreDelta: 0 });
    assert.equal(writes[0]['location.lat'], venue.lat);
    assert.equal(writes[0].startTime, start);
    assert.deepEqual(scores, [1]);
});

test('instant host can check in without enrolling and receives the usual late score only once', async t => {
    const crew = {
        host, meetAt: start, address: venue, member: { memberList: [{ user: member, status: 'confirmed' }] },
        attender: [], attendanceRecords: []
    };
    t.mock.method(InstantCrew, 'findById', () => ({ lean: async () => crew }));
    const { writes, scores } = mockWrite(t, InstantCrew, crew);
    await assert.rejects(instant.checkInAsHost(crewId, member, position(0), date(11)), { status: 403 });
    await assert.rejects(instant.checkInAsHost(crewId, host, position(51), date(11)), /50m 이내/);
    assert.deepEqual(await instant.checkInAsHost(crewId, host, position(49), date(11)),
        { alreadyAttended: false, attendanceStatus: 'late', scoreDelta: -1 });
    assert.deepEqual(await instant.checkInAsHost(crewId, host, position(49), date(12)),
        { alreadyAttended: true, attendanceStatus: 'late', scoreDelta: 0 });
    assert.equal(writes[0].host, host);
    assert.equal(writes[0]['address.lat'], venue.lat);
    assert.equal(writes[0].meetAt, start);
    assert.deepEqual(scores, [-1]);
});

test('the attendance page exposes self check-in only to an eligible host', async () => {
    const render = overrides => ejs.renderFile('views/crew/attendance.ejs', {
        user: null, csrf: 'test', mode: 'day', date: '2026-11-10',
        crew: { _id: crewId, host }, isOwner: true, canIssue: true,
        activity: { _id: activityId, location: venue }, activities: [],
        members: [{ id: host, name: '모임장', attended: false }],
        ...overrides
    });
    const regularPage = await render();
    assert.match(regularPage, /id="check-host-attendance"[^>]+\/activity\/[^/]+\/host-check/);
    assert.match(regularPage, /id="generate-qr"/);
    assert.match(await render({ instantAttendance: true }), /id="check-host-attendance"[^>]+\/attendance\/host-check/);
    assert.doesNotMatch(await render({ isOwner: false }), /id="check-host-attendance"/);
    assert.doesNotMatch(await render({ members: [] }), /id="check-host-attendance"/);
});

test('regular participants still check in with a valid QR and no position', async t => {
    const token = 'b'.repeat(64);
    const activity = { startTime: start, status: '활동', location: venue, teamBlue: [member], attender: [] };
    const crew = { host, member: { memberList: [{ user: member }] } };
    const session = { withTransaction: callback => callback(), endSession: async () => {} };
    t.mock.method(RegularCrew, 'findById', () => ({ lean: async () => crew }));
    t.mock.method(Activity, 'findOne', async () => activity);
    t.mock.method(Activity, 'startSession', async () => session);
    t.mock.method(Activity, 'updateOne', async (filter, update) => {
        assert.equal(filter.attendanceQrHash, regular.hash(token));
        assert.deepEqual(filter.attendanceQrExpiresAt, { $gt: date(5) });
        assert.deepEqual(update.$addToSet, { attender: member });
        return { matchedCount: 1 };
    });
    t.mock.method(User, 'updateOne', async () => {});
    assert.deepEqual(await regular.checkIn(crewId, activityId, member, token, date(5)),
        { alreadyAttended: false, attendanceStatus: 'present', scoreDelta: 1 });
});
