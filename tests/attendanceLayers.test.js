const { test } = require('node:test');
const assert = require('node:assert/strict');
const Activity = require('../models/crewActivity');
const User = require('../models/User');
const service = require('../services/crew/attendanceService');
const instantService = require('../services/crew/instantAttendanceService');
const controller = require('../controllers/crew/attendanceController');
const instantController = require('../controllers/crew/instantAttendanceController');
const middleware = require('../middlewares/attendanceMiddleware');
const utils = require('../utils/attendanceUtils');
function chain(result) {
    return { select() { return this; }, sort() { return this; }, async lean() { return result; } };
}
const forwardError = error => { if (error) throw error; };

test('calendar validates its month, queries only its crew and groups Korean dates', async t => {
    const activities = [{ _id: 'a', startTime: new Date('2026-11-01T15:30:00Z') }];
    t.mock.method(Activity, 'find', query => {
        assert.equal(query.crewId, 'crew');
        assert.equal(query.crewModel, 'regular');
        assert.equal(query.startTime.$gte.toISOString(), '2026-10-31T15:00:00.000Z');
        return chain(activities);
    });
    const req = { params: { crewId: 'crew' }, query: { month: '2026-11' } };
    const res = { locals: {}, render(view, data) {
        assert.equal(view, 'crew/attendance');
        assert.equal(data.mode, 'calendar');
        assert.deepEqual(data.dates['2026-11-02'], activities);
    } };
    middleware.validateCalendar(req, res, forwardError);
    await controller.getCalendar(req, res, forwardError);
});
test('day view preserves attendance states and deleted-user names', async t => {
    const activity = { _id: 'a', startTime: new Date(), teamBlue: ['one', 'two'], teamRed: ['three'], attender: ['one'], attendanceRecords: [{ user: 'two', status: 'late' }], attendanceSettledAt: new Date() };
    t.mock.method(Activity, 'find', () => chain([activity]));
    t.mock.method(User, 'find', () => chain([{ _id: 'one', name: '첫째' }]));
    const req = { params: { crewId: 'crew', date: '2026-11-12' }, query: { activity: 'a' } };
    const res = { locals: {}, render(view, data) {
        assert.deepEqual(data.members.map(m => m.status), ['present', 'late', 'absent']);
        assert.equal(data.members[1].name, '탈퇴한 멤버');
    } };
    middleware.validateDay(req, res, forwardError);
    await controller.getDay(req, res, forwardError);
    req.query.activity = 'other';
    let error;
    await controller.getDay(req, res, value => { error = value; });
    assert.equal(error.status, 404);
});
test('empty day and invalid dates retain their expected behavior', async t => {
    t.mock.method(Activity, 'find', () => chain([]));
    t.mock.method(User, 'find', () => chain([]));
    await controller.getDay({ params: { crewId: 'crew' }, query: {} }, {
        locals: { attendanceDate: '2026-11-12' }, render(view, data) {
            assert.equal(data.activity, undefined); assert.deepEqual(data.members, []);
        }
    }, forwardError);
    let error;
    middleware.validateDay({ params: { date: '2026-02-30' } }, { locals: {} }, value => { error = value; });
    assert.equal(error.status, 400);
});
test('instant attendance uses shared utilities and DB member names', async t => {
    const crew = { _id: 'crew', title: '번개', host: 'one', meetAt: new Date(), member: { memberList: [] }, attender: [] };
    t.mock.method(User, 'find', () => chain([{ _id: 'one', name: '방장' }]));
    await instantController.getAttendance({}, { locals: { crew }, render(view, data) {
        assert.equal(data.mode, 'day'); assert.equal(data.members[0].name, '방장');
        assert.equal(data.members[0].status, 'pending');
    } }, forwardError);
});
test('QR utility keeps tokens in the URL fragment and returns an image', async t => {
    const qr = require('qrcode');
    t.mock.method(qr, 'toDataURL', async (value, options) => {
        const url = new URL(value);
        assert.equal(url.pathname, '/check'); assert.equal(url.search, '');
        assert.equal(url.hash, '#token=secret'); assert.equal(options.width, 280);
        return 'data:image/png;base64,test';
    });
    assert.equal(await utils.createQrImage('/check', 'https://example.test', 'secret'), 'data:image/png;base64,test');
});
test('services export only async DB functions', () => {
    for (const module of [service, instantService]) {
        for (const fn of Object.values(module)) assert.equal(fn.constructor.name, 'AsyncFunction');
    }
});
test('attendance errors preserve HTML and JSON response modes', () => {
    for (const [handler, method, path, expected] of [
        [middleware.regularError, 'GET', '/', 'html'],
        [middleware.regularError, 'POST', '/', 'json'],
        [middleware.instantError, 'GET', '/status', 'json']
    ]) {
        let mode;
        const res = { status(code) { assert.equal(code, 403); return this; }, json() { mode='json'; }, render() { mode='html'; } };
        handler(Object.assign(new Error('denied'), { status: 403 }), { method, path }, res, () => {});
        assert.equal(mode, expected);
    }
});
