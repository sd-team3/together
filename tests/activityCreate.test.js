const { test } = require('node:test');
const assert = require('node:assert/strict');
const { activityCreateMiddleware } = require('../middlewares/activityMiddleware');
const activityService = require('../services/crew/activityService');
const controller = require('../controllers/crew/activityController');
const crewId = '111111111111111111111111';

test('creation preserves selected coordinates through validation and controller save', async t => {
    const location = { state: '부산', city: '해운대구', detail: '실제 장소', lat: 35.1631, lng: 129.1635 };
    const req = { body: { crewModel: 'regular', content: '활동', startTime: '2027-01-01T10:00:00+09:00', endTime: '2027-01-01T12:00:00+09:00', capacity: 10, gameType: 'team', location }, crewModel: { modelName: 'regularCrew' }, crew: { _id: crewId } };
    let next = false;
    activityCreateMiddleware(req, { status() { throw Error('unexpected validation failure'); } }, () => { next = true; });
    assert(next); assert.deepEqual(req.activityData.location, location);
    t.mock.method(activityService, 'createActivity', async data => { assert.deepEqual(data.location, location); assert.equal(data.crewId, crewId); });
    await controller.postActivityCreate(req, { status(code) { assert.equal(code, 201); return this; }, json() {} });
    for (const lat of [null, '', 'bad', 91]) {
        let status;
        req.body.location = { ...location, lat };
        activityCreateMiddleware(req, { status(code) { status = code; return this; }, json() {} }, () => { throw Error('invalid coordinates accepted'); });
        assert.equal(status, 400);
    }
});
