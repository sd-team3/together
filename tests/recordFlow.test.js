const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');
const CrewActivity = require('../models/crewActivity');
const InstantCrew = require('../models/instantCrew');
const service = require('../services/recordService');
const controller = require('../controllers/recordController');
const { CONSTANTS } = require('../config/constants');

test('participation is scoped to the authenticated user and dates use Korea time', async t => {
    t.mock.method(CrewActivity, 'find', query => {
        assert.equal(query.attender, 'signed-in-user');
        assert.equal(query.crewModel, 'regular');
        assert.ok(query.startTime.$lte instanceof Date);
        return { select() { return this; }, populate() { return this; }, async lean() {
            return [
                { _id: 'a1', crewId: { _id: 'c1', title: '정기 모임', sport: 'soccer' },
                    title: '저녁 운동', startTime: new Date('2026-10-10T16:00:00Z') },
                { _id: 'deleted', crewId: null }
            ];
        } };
    });
    t.mock.method(InstantCrew, 'find', query => {
        assert.equal(query.$or[0].host, 'signed-in-user');
        assert.deepEqual(query.$or[1]['member.memberList'].$elemMatch,
            { user: 'signed-in-user', status: 'confirmed' });
        assert.ok(query.meetAt.$lte instanceof Date);
        return { select() { return this; }, async lean() {
            return [{ _id: 'i1', title: '번개 모임', sport: 'tennis', meetAt: new Date('2026-10-09T03:00:00Z') }];
        } };
    });
    const result = await service.getMyActivities('signed-in-user');
    assert.equal(result.length, 2);
    assert.equal(result[0].date, '2026-10-11');
    assert.equal(result[0].crewKey, 'regular:c1');
    assert.equal(result[1].crewKey, 'instant:i1');
});

test('activity controller ignores supplied user IDs and does not cache private results', async t => {
    t.mock.method(service, 'getMyActivities', async userId => {
        assert.equal(userId, 'authenticated');
        return [];
    });
    const headers = {};
    let body;
    await controller.getMyActivities({ user: { _id: 'authenticated' }, query: { user: 'someone-else' } }, {
        set(key, value) { headers[key] = value; }, json(value) { body = value; }
    }, error => { throw error; });
    assert.equal(headers['Cache-Control'], 'no-store');
    assert.deepEqual(body, []);
});

test('list renders safely with empty data, records, filters and pagination', async () => {
    for (const records of [[], [{ _id: 'record1', sport: 'soccer', exerciseDate: '2026-10-10',
        good: '<img src=x onerror=alert(1)>', mood: 4 }]]) {
        const html = await ejs.renderFile(path.join(__dirname, '../views/record/record-preview.ejs'), {
            user: null, records, recordsJson: JSON.stringify(records).replace(/</g, '\\u003c'),
            sports: CONSTANTS.SPORTS, selectedSport: 'soccer', totalRecords: records.length,
            allRecordCount: records.length, sportCount: records.length, currentPage: 2, totalPages: 3
        });
        assert.match(html, /data-view="list"/);
        assert.match(html, /class="editor card"[^>]*hidden/);
        assert.match(html, /id="activity-picker"[^>]*hidden/);
        assert.match(html, /page=3&amp;sport=soccer/);
        assert.doesNotMatch(html, /<img src=x/);
        assert.match(html, /id="new-record">＋ 작성하기/);
    }
});
