const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'),
    path = require('path'),
    ejs = require('ejs');
const Crew = require('../models/instantCrew');
const service = require('../services/crew/instantAttendanceService');
const crewId = '111111111111111111111111',
    host = '222222222222222222222222',
    member = '333333333333333333333333',
    outsider = '444444444444444444444444';
const now = new Date('2026-10-25T14:55:00Z');
const crew = {
    _id: crewId,
    title: '번개 볼링',
    host,
    meetAt: new Date('2026-10-25T14:50:00Z'),
    address: { state: '서울', city: '도봉구', detail: '볼링장' },
    member: {
        memberList: [
            { user: host, status: 'confirmed' },
            { user: member, status: 'confirmed' },
            { user: outsider, status: 'noshow' }
        ]
    },
    attender: []
};
function mock(t, row = crew) {
    t.mock.method(Crew, 'findById', () => ({ lean: async () => row }));
}
test('instant attendance accepts only host and confirmed members', async (t) => {
    mock(t);
    assert.equal((await service.access(crewId, host)).isOwner, true);
    assert.equal((await service.access(crewId, member)).isOwner, false);
    await assert.rejects(service.access(crewId, outsider), { status: 403 });
    await assert.rejects(service.access('bad', member), { status: 400 });
    assert.deepEqual(service.roster({ ...crew, attender: [member] }), [
        { id: host, attended: false },
        { id: member, attended: true }
    ]);
});
test('only host issues one-minute QR and attendance crosses midnight for three hours', async (t) => {
    mock(t);
    let saved;
    t.mock.method(Crew, 'updateOne', async (q, u) => {
        saved = u.$set;
        return { matchedCount: 1 };
    });
    await assert.rejects(service.issueQr(crewId, member, now), { status: 403 });
    const result = await service.issueQr(crewId, host, now);
    assert.equal(result.expiresAt - now, 60000);
    assert.notEqual(saved.attendanceQrHash, result.token);
    assert(service.isOpen(crew, new Date('2026-10-25T15:30:00Z')));
    assert(!service.isOpen(crew, new Date('2026-10-25T17:50:00Z')));
    await assert.rejects(service.issueQr(crewId, host, new Date('2026-10-25T14:49:00Z')), {
        status: 409
    });
});
test('check-in guards membership and QR expiration atomically and is repeat-safe', async (t) => {
    mock(t);
    let calls = 0;
    t.mock.method(Crew, 'updateOne', async (q, u) => {
        assert.equal(q._id, crewId);
        assert.equal(q.$or[1]['member.memberList'].$elemMatch.status, 'confirmed');
        assert.equal(q.attendanceQrExpiresAt.$gt, now);
        assert.deepEqual(u, { $addToSet: { attender: member } });
        return { matchedCount: 1, modifiedCount: calls++ ? 0 : 1 };
    });
    assert.deepEqual(await service.checkIn(crewId, member, 'a'.repeat(64), now), {
        alreadyAttended: false
    });
    assert.deepEqual(await service.checkIn(crewId, member, 'a'.repeat(64), now), {
        alreadyAttended: true
    });
    await assert.rejects(service.checkIn(crewId, outsider, 'a'.repeat(64), now), { status: 403 });
    await assert.rejects(service.checkIn(crewId, member, 'bad', now), { status: 400 });
});
test('expired or replaced QR cannot check in', async (t) => {
    mock(t);
    t.mock.method(Crew, 'updateOne', async () => ({ matchedCount: 0 }));
    await assert.rejects(service.checkIn(crewId, member, 'a'.repeat(64), now), { status: 409 });
});
test('shared attendance page renders instant endpoints without calendar or schedule modal', () => {
    const filename = path.resolve('views/crew/attendance.ejs');
    const source = fs.readFileSync(filename, 'utf8');
    const data = {
        user: null,
        csrf: 'token',
        crew,
        instantAttendance: true,
        isOwner: true,
        mode: 'day',
        date: '2026-10-25',
        activity: service.activity(crew),
        activities: [],
        members: [{ id: member, name: '<script>', attended: false }],
        canIssue: true
    };
    const html = ejs.render(source, data, { filename });
    assert(html.includes('/instant/' + crewId + '/attendance/qr'));
    assert(!html.includes('달력으로'));
    assert(!html.includes('addScheduleForm'));
    assert(html.includes('data-status-url'));
    assert(html.includes('&lt;script&gt;'));
    const check = ejs.render(source, { ...data, mode: 'check', isOwner: false }, { filename });
    assert(check.includes('/instant/' + crewId + '/attendance/check'));
    assert(check.includes('출석하기'));
    assert(!check.includes('generate-qr'));
});
