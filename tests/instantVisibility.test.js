const { test } = require('node:test');
const assert = require('node:assert/strict');
const Crew = require('../models/instantCrew');
const service = require('../services/crew/instantService');
test('map keeps ongoing matches for three hours and does not replace another hosts match', async (t) => {
    const now = Date.now();
    t.mock.method(Date, 'now', () => now);
    const data = [
        { title: 'existing', meetAt: new Date(now - 2 * 60000) },
        { title: 'new', meetAt: new Date(now + 10 * 60000) },
        { title: 'expired', meetAt: new Date(now - 4 * 3600000) }
    ];
    t.mock.method(Crew, 'find', (query) => {
        assert.equal(query.meetAt.$gte.getTime(), now - 3 * 3600000);
        const result = data.filter((row) => row.meetAt >= query.meetAt.$gte);
        const chain = {
            sort: () => chain,
            populate: () => chain,
            then: (resolve) => Promise.resolve(result).then(resolve)
        };
        return chain;
    });
    const { crews } = await service.getInstantCrew();
    assert.deepEqual(
        crews.map((c) => c.title),
        ['existing', 'new']
    );
});
test('time visibility change preserves sport and location filters', async (t) => {
    t.mock.method(Crew, 'find', (query) => {
        assert.deepEqual(query.sport, { $in: ['bowling'] });
        assert.equal(query['address.city'], '도봉구');
        const chain = {
            sort: () => chain,
            populate: () => chain,
            then: (resolve) => Promise.resolve([]).then(resolve)
        };
        return chain;
    });
    await service.getInstantCrew({ sport: ['bowling'], city: '도봉구' });
});
