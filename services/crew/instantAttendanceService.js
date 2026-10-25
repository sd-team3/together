const crypto = require('crypto');
const Crew = require('../../models/instantCrew');
const { fail, id, hash, requireId, dateKey, isOpen: activityIsOpen } = require('./attendanceService');
const DURATION = 3 * 60 * 60 * 1000;

function activity(crew) {
  return { _id: crew._id, title: crew.title, startTime: crew.meetAt,
    endTime: new Date(new Date(crew.meetAt).getTime() + DURATION), location: crew.address };
}
const isOpen = (crew, now = new Date()) => activityIsOpen(activity(crew), now);
async function access(crewId, userId) {
  requireId(crewId);
  const crew = await Crew.findById(crewId).lean();
  if (!crew) throw fail(404, '모임을 찾을 수 없습니다.');
  const isOwner = id(crew.host) === id(userId);
  if (!isOwner && !crew.member.memberList.some(m => id(m.user) === id(userId) && m.status === 'confirmed')) {
    throw fail(403, '참가 확정된 모임원만 출석부를 이용할 수 있습니다.');
  }
  return { crew, isOwner };
}
function roster(crew) {
  const attended = new Set((crew.attender || []).map(id));
  const ids = [...new Set([id(crew.host), ...crew.member.memberList.filter(m => m.status === 'confirmed').map(m => id(m.user))])];
  return ids.map(userId => ({ id: userId, attended: attended.has(userId) }));
}
async function issueQr(crewId, userId, now = new Date()) {
  const { crew, isOwner } = await access(crewId, userId);
  if (!isOwner) throw fail(403, '모임장만 QR을 생성할 수 있습니다.');
  if (!isOpen(crew, now)) throw fail(409, '모임 시작 후 3시간 동안 QR을 생성할 수 있습니다.');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Math.min(now.getTime() + 60000, activity(crew).endTime.getTime()));
  const result = await Crew.updateOne({ _id: crewId, host: userId, meetAt: crew.meetAt }, {
    $set: { attendanceQrHash: hash(token), attendanceQrExpiresAt: expiresAt }
  });
  if (!result.matchedCount) throw fail(409, '모임 정보가 변경되었습니다. 새로고침해주세요.');
  return { token, expiresAt };
}
async function checkIn(crewId, userId, token, now = new Date()) {
  if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token)) throw fail(400, 'QR을 다시 스캔해주세요.');
  const { crew } = await access(crewId, userId);
  if (!isOpen(crew, now)) throw fail(409, '모임 시작 후 3시간 동안 출석할 수 있습니다.');
  const result = await Crew.updateOne({
    _id: crewId, meetAt: { $lte: now, $gt: new Date(now.getTime() - DURATION) },
    $or: [{ host: userId }, { 'member.memberList': { $elemMatch: { user: userId, status: 'confirmed' } } }],
    attendanceQrHash: hash(token), attendanceQrExpiresAt: { $gt: now }
  }, { $addToSet: { attender: userId } });
  if (!result.matchedCount) throw fail(409, 'QR이 만료되었거나 참가 정보가 변경되었습니다. 새 QR로 시도해주세요.');
  return { alreadyAttended: result.modifiedCount === 0 };
}
module.exports = { access, activity, isOpen, roster, issueQr, checkIn, dateKey };
