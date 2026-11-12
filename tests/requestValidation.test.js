const { test } = require('node:test');
const assert = require('node:assert/strict');
const middleware = require('../middlewares/requestValidation');

function run(name, options = {}) {
    const result = { next: false };
    const headers = options.headers || {};
    const req = {
        method: options.method || 'POST',
        session: { attendanceCsrf: 'token' },
        isAuthenticated: () => options.authenticated !== false,
        is: () => options.json !== false,
        get: name => headers[name]
    };
    const res = {
        status(value) { result.status = value; return this; },
        json(value) { result.body = value; },
        set(name, value) { result[name] = value; }
    };
    middleware[name](req, res, () => { result.next = true; });
    return result;
}

test('API login guards keep their original 401 messages', () => {
    for (const [name, message] of [
        ['recordLoginValidation', '다시 로그인한 뒤 저장해주세요.'],
        ['webPushLoginValidation', '로그인이 필요합니다.']
    ]) {
        assert.deepEqual(run(name, { authenticated: false }), { next: false, status: 401, body: { message } });
        assert.equal(run(name).next, true);
    }
});

test('record save accepts JSON and rejects form and cross-site requests', () => {
    assert.equal(run('recordSaveValidation').next, true);
    for (const options of [{ json: false }, { headers: { 'Sec-Fetch-Site': 'cross-site' } }]) {
        const result = run('recordSaveValidation', options);
        assert.equal(result.status, 403);
        assert.equal(result.next, false);
        assert.equal(result.body.message, '운동 기록 화면에서 다시 저장해주세요.');
    }
});

test('attendance checks POST JSON, site and session CSRF while allowing GET', () => {
    const name = 'attendanceRequestValidation';
    assert.equal(run(name, { method: 'GET', json: false }).next, true);
    assert.equal(run(name, { headers: { 'X-Attendance-CSRF': 'token' } }).next, true);
    for (const options of [
        {}, { headers: { 'X-Attendance-CSRF': 'wrong' } },
        { json: false, headers: { 'X-Attendance-CSRF': 'token' } },
        { headers: { 'X-Attendance-CSRF': 'token', 'Sec-Fetch-Site': 'cross-site' } }
    ]) {
        const result = run(name, options);
        assert.equal(result.status, 403);
        assert.equal(result.next, false);
        assert.equal(result.body.message, '페이지를 새로고침한 후 다시 시도해주세요.');
    }
});

test('push checks every non-GET request and keeps its extra header requirement', () => {
    const name = 'webPushRequestValidation';
    assert.equal(run(name, { method: 'GET', json: false }).next, true);
    for (const method of ['PUT', 'DELETE', 'POST', 'HEAD']) {
        assert.equal(run(name, { method, headers: { 'X-Together-Push': '1' } }).next, true);
        for (const options of [{}, { json: false }, { headers: { 'X-Together-Push': '1', 'Sec-Fetch-Site': 'cross-site' } }]) {
            const result = run(name, { method, ...options });
            assert.equal(result.status, 403);
            assert.equal(result.body.message, '설정 화면에서 다시 시도해주세요.');
        }
    }
    assert.equal(run('noStore')['Cache-Control'], 'no-store');
});
