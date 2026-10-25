const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const service = require('../services/crew/attendanceService');
const Activity = require('../models/crewActivity');
const Crew = require('../models/regularCrew');
const crewId = '111111111111111111111111', activityId = '222222222222222222222222';
const host = '333333333333333333333333', member = '444444444444444444444444';
const now = new Date('2026-10-13T04:00:00Z');
const crew = { _id: crewId, title: '테스트 크루', host, member: { memberList: [{ user: member }] } };
const activity = { _id: activityId, crewId, crewModel: 'regular', title: '오후 운동', startTime: new Date('2026-10-13T03:00:00Z'), endTime: new Date('2026-10-13T05:00:00Z'), status: '활동', teamBlue: [member], teamRed: [], attender: [], location: { state: '서울', city: '노원구', detail: '체육관' } };
function mockData(t, act = activity) {
  t.mock.method(Crew, 'findById', () => ({ lean: async () => crew }));
  t.mock.method(Activity, 'findOne', async query => { assert.equal(query.crewId, crewId); assert.equal(query.crewModel, 'regular'); return act; });
}
test('calendar uses Korean dates and handles leap years and month rollover', () => {
  assert.equal(service.dateKey('2026-10-12T15:30:00Z'), '2026-10-13');
  assert.equal(service.monthInfo('2028-02').days, 29);
  assert.equal(service.monthInfo('2026-01').previous, '2025-12');
  assert.equal(service.monthInfo('2026-12').next, '2027-01');
  assert.equal(service.monthInfo('2026-10').start.toISOString(), '2026-09-30T15:00:00.000Z');
  for (const day of ['2026-02-29', '2026-10-00', 'bad']) assert.throws(() => service.validDay(day));
});
test('only owner and members can view attendance', async t => {
  mockData(t);
  assert.equal((await service.access(crewId, host)).isOwner, true);
  assert.equal((await service.access(crewId, member)).isOwner, false);
  await assert.rejects(service.access(crewId, 'outsider'), { status: 403 });
  await assert.rejects(service.access('bad', member), { status: 400 });
});
test('participants combine both teams without double counting', () => {
  assert.deepEqual(service.participants({ teamBlue: [member], teamRed: [member, host] }), [member, host]);
});
test('only owner can issue a QR; token is hashed and expires after one minute', async t => {
  mockData(t);
  let saved;
  t.mock.method(Activity, 'updateOne', async (query, update) => { saved = update.$set; return { matchedCount: 1 }; });
  await assert.rejects(service.issueQr(crewId, activityId, member, now), { status: 403 });
  const result = await service.issueQr(crewId, activityId, host, now);
  assert.match(result.token, /^[a-f0-9]{64}$/);
  assert.notEqual(result.token, saved.attendanceQrHash);
  assert.equal(result.expiresAt.getTime() - now.getTime(), 60000);
});
test('future and ended activities cannot issue QR codes', async t => {
  mockData(t);
  for (const date of [new Date('2026-10-13T02:00:00Z'), new Date('2026-10-13T05:00:00Z')]) await assert.rejects(service.issueQr(crewId, activityId, host, date), { status: 409 });
  assert.equal(service.isOpen({ ...activity, status: '종료' }, now), false);
  assert.equal(service.isOpen({ ...activity, endTime: null }, new Date('2026-10-13T15:00:00Z')), false);
});
test('QR check-in is atomic, participant-specific and repeat-safe', async t => {
  mockData(t); let calls = 0;
  t.mock.method(Activity, 'updateOne', async (query, update) => {
    assert.equal(query.crewId, crewId);
    assert.equal(query.attendanceQrExpiresAt.$gt, now);
    assert.equal(query.$and[1].$or[0].teamBlue, member);
    assert.deepEqual(update, { $addToSet: { attender: member } });
    return { matchedCount: 1, modifiedCount: calls++ ? 0 : 1 };
  });
  assert.deepEqual(await service.checkIn(crewId, activityId, member, 'a'.repeat(64), now), { alreadyAttended: false });
  assert.deepEqual(await service.checkIn(crewId, activityId, member, 'a'.repeat(64), now), { alreadyAttended: true });
  await assert.rejects(service.checkIn(crewId, activityId, host, 'a'.repeat(64), now), { status: 403 });
});
test('invalid, expired or replaced QR never produces a successful check-in', async t => {
  mockData(t);
  t.mock.method(Activity, 'updateOne', async () => ({ matchedCount: 0 }));
  await assert.rejects(service.checkIn(crewId, activityId, member, 'bad', now), { status: 400 });
  await assert.rejects(service.checkIn(crewId, activityId, member, 'a'.repeat(64), now), { status: 409 });
});
test('activity from another crew is rejected', async t => {
  mockData(t, null);
  await assert.rejects(service.activityFor(crewId, activityId), { status: 404 });
});
test('calendar, empty day, multiple activities, check page and member/host views render', () => {
  const filename = path.resolve('views/crew/attendance.ejs');
  const source = fs.readFileSync(filename, 'utf8');
  const render = data => ejs.render(source, { CONSTANTS: require('../config/constants').CONSTANTS, user: null, csrf: 'test', crew, isOwner: true, ...data }, { filename });
  const calendar = render({ mode: 'calendar', month: service.monthInfo('2026-10'), dates: { '2026-10-13': [activity] }, today: '2026-10-13' });
  assert(calendar.includes('/attendance/day/2026-10-13'));
  assert(calendar.includes('id="addScheduleForm"'));
  const memberCalendar = render({mode:'calendar', month:service.monthInfo('2026-10'), dates:{}, today:'2026-10-13', isOwner:false});
  assert(!memberCalendar.includes('id="addScheduleForm"'));
  assert(!memberCalendar.includes('+ 일정 추가'));
  assert(render({ mode: 'day', date: '2026-10-13', activity: null, activities: [], members: [], canIssue: false }).includes('등록된 활동이 없어요'));
  const data = { mode: 'day', date: '2026-10-13', activity, activities: [activity, { ...activity, _id: host, title: '두 번째 활동' }], members: [{ id: member, name: '<script>bad</script>', attended: false }], canIssue: true };
  assert(render(data).includes('id="generate-qr"'));
  assert(render(data).includes('두 번째 활동'));
  assert(!render({ ...data, isOwner: false }).includes('id="generate-qr"'));
  assert(render(data).includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert(render({ mode: 'check', activity }).includes('출석하기'));
  assert(render({ mode: 'error', message: '권한 없음' }).includes('권한 없음'));
});
