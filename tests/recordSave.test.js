const { test } = require('node:test');
const assert = require('node:assert/strict');
const Record = require('../models/Record');
const CrewActivity = require('../models/crewActivity');
const InstantCrew = require('../models/instantCrew');
const service = require('../services/recordService');
const controller = require('../controllers/recordController');

const userId = '111111111111111111111111';
const crewId = '222222222222222222222222';
const activityId = '333333333333333333333333';
const input = {
    submissionId: '11111111-1111-4111-8111-111111111111',
    crewKey: `regular:${crewId}`, activityId, mood: 4, good: ' 잘했어요 ', improve: '', goal: '다음 목표'
};
function mockActivities(t, activities = []) {
    t.mock.method(CrewActivity, 'find', query => {
        assert.equal(query.attender, userId);
        return { select() { return this; }, populate() { return this; }, async lean() { return activities; } };
    });
    t.mock.method(InstantCrew, 'find', () => ({ select() { return this; }, async lean() { return []; } }));
}
function attendedActivity() {
    return { _id: activityId, crewId: { _id: crewId, title: '함께 축구', sport: 'soccer' },
        title: '저녁 활동', startTime: new Date('2026-10-10T16:00:00Z') };
}

test('saves verified participation and ignores forged owner, date and sport', async t => {
    mockActivities(t, [attendedActivity()]);
    t.mock.method(Record, 'findOne', async () => null);
    t.mock.method(Record, 'create', async values => {
        assert.equal(values.user, userId);
        assert.equal(values.exerciseDate, '2026-10-11');
        assert.equal(values.sport, 'soccer');
        assert.equal(values.crewTitle, '함께 축구');
        assert.equal(values.good, '잘했어요');
        await new Record(values).validate();
        return values;
    });
    await service.createRecord(userId, { ...input, user: 'attacker', sport: 'tennis', exerciseDate: '2099-01-01' });
});

test('rejects missing participation and never writes', async t => {
    mockActivities(t);
    t.mock.method(Record, 'findOne', async () => null);
    const create = t.mock.method(Record, 'create', async () => assert.fail('Unauthorized write'));
    await assert.rejects(service.createRecord(userId, input), { status: 403 });
    assert.equal(create.mock.callCount(), 0);
});

test('rejects malformed input and invalid mood or notes before querying DB', async t => {
    const find = t.mock.method(Record, 'findOne', async () => assert.fail('Unexpected query'));
    for (const body of [null, {}, { ...input, mood: 0 }, { ...input, mood: '4' },
        { ...input, good: 'a'.repeat(1001) }, { ...input, goal: { $ne: '' } },
        { ...input, activityId: { $ne: null } }, { ...input, submissionId: 'invalid' }]) {
        await assert.rejects(service.createRecord(userId, body), { status: 400 });
    }
    assert.equal(find.mock.callCount(), 0);
});

test('retry after a lost response returns the saved record without another write', async t => {
    const existing = { _id: 'saved' };
    t.mock.method(Record, 'findOne', async query => {
        assert.deepEqual(query, { user: userId, submissionId: input.submissionId });
        return existing;
    });
    const create = t.mock.method(Record, 'create', async () => assert.fail('Duplicate write'));
    assert.equal(await service.createRecord(userId, input), existing);
    assert.equal(create.mock.callCount(), 0);
});

test('simultaneous requests recover the record from a duplicate key error', async t => {
    mockActivities(t, [attendedActivity()]);
    let queried = false;
    t.mock.method(Record, 'findOne', async () => {
        if (queried) return { _id: 'saved' };
        queried = true;
        return null;
    });
    t.mock.method(Record, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
    assert.equal((await service.createRecord(userId, input))._id, 'saved');
});

test('older exercise redirects to its page within this user records', async t => {
    const record = { _id: activityId, exerciseDate: '2026-10-11' };
    t.mock.method(Record, 'countDocuments', async query => {
        assert.equal(query.user, userId);
        assert.equal(query.$or[1]._id.$gt, activityId);
        return 18;
    });
    assert.equal(await service.getRecordPage(userId, record), 3);
    t.mock.method(service, 'createRecord', async authenticatedId => {
        assert.equal(authenticatedId, userId);
        return record;
    });
    let status, body;
    const response = { status(value) { status = value; return this; }, json(value) { body = value; } };
    await controller.createRecord({ user: { _id: userId }, body: input }, response);
    assert.equal(status, 201);
    assert.equal(body.redirect, `/record?page=3&saved=${activityId}`);
});

test('DB failure returns a retry message without exposing DB details', async t => {
    t.mock.method(service, 'createRecord', async () => { throw new Error('private DB connection string'); });
    let status, body;
    await controller.createRecord({ user: { _id: userId }, body: input }, {
        status(value) { status = value; return this; }, json(value) { body = value; }
    });
    assert.equal(status, 500);
    assert.doesNotMatch(body.message, /private/);
});
