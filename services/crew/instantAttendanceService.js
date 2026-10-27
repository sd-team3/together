const crypto = require('crypto');
const Crew = require('../../models/instantCrew');
const User = require('../../models/User');
const {
    fail,
    id,
    hash,
    requireId,
    dateKey,
    isOpen: activityIsOpen,
    attendanceStatus,
    attendanceDeadline,
    attendanceScoreDelta
} = require('./attendanceService');
const DURATION = 3 * 60 * 60 * 1000;

function activity(crew) {
    return {
        _id: crew._id,
        title: crew.title,
        startTime: crew.meetAt,
        endTime: new Date(new Date(crew.meetAt).getTime() + DURATION),
        location: crew.address
    };
}
const isOpen = (crew, now = new Date()) => activityIsOpen(activity(crew), now);
async function access(crewId, userId) {
    requireId(crewId);
    const crew = await Crew.findById(crewId).lean();
    if (!crew) throw fail(404, '모임을 찾을 수 없습니다.');
    const isOwner = id(crew.host) === id(userId);
    if (
        !isOwner &&
        !crew.member.memberList.some((m) => id(m.user) === id(userId) && m.status === 'confirmed')
    ) {
        throw fail(403, '참가 확정된 모임원만 출석부를 이용할 수 있습니다.');
    }
    return { crew, isOwner };
}
function roster(crew) {
    const attended = new Set((crew.attender || []).map(id));
    const records = new Map((crew.attendanceRecords || []).map((record) => [id(record.user), record]));
    const ids = [
        ...new Set([
            id(crew.host),
            ...crew.member.memberList
                .filter((m) => m.status === 'confirmed' || m.status === 'noshow')
                .map((m) => id(m.user))
        ])
    ];
    return ids.map((userId) => {
        const record = records.get(userId);
        const status = record?.status || (attended.has(userId) ? 'present' : crew.attendanceSettledAt ? 'absent' : 'pending');
        return { id: userId, status, attended: status === 'present' || status === 'late' };
    });
}
async function issueQr(crewId, userId, now = new Date()) {
    const { crew, isOwner } = await access(crewId, userId);
    if (!isOwner) throw fail(403, '모임장만 QR을 생성할 수 있습니다.');
    if (!isOpen(crew, now)) throw fail(409, '모임 시작 후 30분까지만 QR을 생성할 수 있습니다.');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Math.min(now.getTime() + 60000, attendanceDeadline(crew.meetAt).getTime()));
    const result = await Crew.updateOne(
        {
            _id: crewId,
            host: userId,
            attendanceSettledAt: null,
            $and: [
                { meetAt: crew.meetAt },
                { meetAt: { $lte: now, $gte: new Date(now.getTime() - 30 * 60 * 1000) } }
            ]
        },
        { $set: { attendanceQrHash: hash(token), attendanceQrExpiresAt: expiresAt, attendancePolicyEnabled: true } }
    );
    if (!result.matchedCount) throw fail(409, '모임 정보가 변경되었습니다. 새로고침해주세요.');
    return { token, expiresAt };
}
async function checkIn(crewId, userId, token, now = new Date()) {
    if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token))
        throw fail(400, 'QR을 다시 스캔해주세요.');
    const { crew } = await access(crewId, userId);
    if (!isOpen(crew, now)) throw fail(409, '모임 시작 후 30분까지만 출석할 수 있습니다.');
    const existingRecord = (crew.attendanceRecords || []).find((record) => id(record.user) === id(userId));
    if (existingRecord || (crew.attender || []).some((attender) => id(attender) === id(userId))) {
        return { alreadyAttended: true, attendanceStatus: existingRecord?.status || 'present', scoreDelta: 0 };
    }
    const status = attendanceStatus(crew.meetAt, now);
    const scoreDelta = attendanceScoreDelta(status);
    const session = await Crew.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            result = await Crew.updateOne(
                {
                    _id: crewId,
            meetAt: { $lte: now, $gte: new Date(now.getTime() - 30 * 60 * 1000) },
                    attendanceSettledAt: null,
                    $or: [
                        { host: userId },
                        { 'member.memberList': { $elemMatch: { user: userId, status: 'confirmed' } } }
                    ],
                    attendanceRecords: { $not: { $elemMatch: { user: userId } } },
                    attendanceQrHash: hash(token),
                    attendanceQrExpiresAt: { $gt: now }
                },
                {
                    $addToSet: { attender: userId },
                    $push: { attendanceRecords: { user: userId, status, checkedInAt: now } },
                    $set: { attendancePolicyEnabled: true }
                },
                { session }
            );
            if (result.matchedCount && scoreDelta !== 0) {
                await User.updateOne(
                    { _id: userId },
                    { $inc: { honor: scoreDelta }, $set: { consecutiveAbsenceCount: 0 } },
                    { session }
                );
            }
        });
    } finally {
        await session.endSession();
    }
    if (!result.matchedCount) {
        const latest = await Crew.findById(crewId).select('attender');
        if (latest?.attender.some((attender) => id(attender) === id(userId))) {
            return { alreadyAttended: true, attendanceStatus: status, scoreDelta: 0 };
        }
        throw fail(409, 'QR이 만료되었거나 참가 정보가 변경되었습니다. 새 QR로 시도해주세요.');
    }
    return { alreadyAttended: false, attendanceStatus: status, scoreDelta };
}
module.exports = { access, activity, isOpen, roster, issueQr, checkIn, dateKey };
