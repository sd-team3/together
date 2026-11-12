const { test } = require('node:test');
const assert = require('node:assert/strict');
const Notification = require('../models/notification');
const service = require('../services/notiService');
const controller = require('../controllers/notiController');
const router = require('../routes/notiRouter');
const { apiLoginValidation } = require('../middlewares/requestValidation');
const owner = '111111111111111111111111';
const notiId = '222222222222222222222222';

test('login guard runs before notification endpoints and blocks unauthenticated requests', () => {
    assert.equal(router.stack[0].handle, apiLoginValidation);
    let status, body, called = false;
    apiLoginValidation({ isAuthenticated: () => false }, {
        status(value) { status = value; return this; }, json(value) { body = value; }
    }, () => { called = true; });
    assert.equal(status, 401); assert.equal(called, false);
    assert.equal(body.message, '로그인이 필요합니다.');
});
for (const [name, operation] of [['readNotiByNotiId', 'findOneAndUpdate'], ['deleteNotiByNotiId', 'findOneAndDelete']]) {
    test(name + ' scopes its write to the authenticated receiver', async t => {
        t.mock.method(Notification, operation, async (filter, update) => {
            assert.deepEqual(filter, { _id: notiId, receiver: owner });
            if (update) assert.deepEqual(update, { isRead: true });
            return { _id: notiId };
        });
        assert.equal((await service[name](notiId, owner))._id, notiId);
    });
    test(name + ' refuses other users or missing notifications', async t => {
        t.mock.method(Notification, operation, async () => null);
        await assert.rejects(service[name](notiId, owner), { status: 404 });
    });
    test(name + ' rejects invalid ids or missing user before querying', async t => {
        let queried = false;
        t.mock.method(Notification, operation, async () => { queried = true; });
        await assert.rejects(service[name]('bad', owner), { status: 400 });
        await assert.rejects(service[name](notiId), { status: 400 });
        assert.equal(queried, false);
    });
}
test('controller forwards authenticated user id and returns success', async t => {
    for (const [handler, operation] of [['patchRead', 'readNotiByNotiId'], ['deleteNoti', 'deleteNotiByNotiId']]) {
        t.mock.method(service, operation, async (id, userId) => {
            assert.equal(id, notiId); assert.equal(userId, owner);
        });
        let body;
        await controller[handler]({ params: { notiId }, user: { _id: owner } }, {
            status(code) { assert.equal(code, 200); return this; }, json(value) { body = value; }
        });
        assert.deepEqual(body, { success: true });
    }
});
test('controller reports inaccessible notifications and hides database errors', async t => {
    for (const [error, status, message] of [
        [Object.assign(new Error('알림을 찾을 수 없습니다.'), { status: 404 }), 404, '알림을 찾을 수 없습니다.'],
        [new Error('private database details'), 500, '알림을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.']
    ]) {
        t.mock.method(service, 'readNotiByNotiId', async () => { throw error; });
        await controller.patchRead({ params: { notiId }, user: { _id: owner } }, {
            status(code) { assert.equal(code, status); return this; },
            json(value) { assert.equal(value.message, message); }
        });
    }
});
