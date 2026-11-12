const Crew = require('../../models/instantCrew');
const User = require('../../models/User');
const { ATTENDANCE_DEADLINE_MS } = require('../../config/attendance');

const {
    fail, id, hash, requireId, instantIsOpen: isOpen, attendanceStatus,
    attendanceScoreDelta, requireNearbyPosition, createQrToken
} = require('../../utils/attendanceUtils');

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

async function issueQr(crewId, userId, now = new Date()) {
    const { crew, isOwner } = await access(crewId, userId);
    if (!isOwner) throw fail(403, '모임장만 QR을 생성할 수 있습니다.');
    if (!isOpen(crew, now)) throw fail(409, '모임 시작 후 30분까지만 QR을 생성할 수 있습니다.');
    const { token, expiresAt } = createQrToken(crew.meetAt, now);
    const result = await Crew.updateOne(
        {
            _id: crewId,
            host: userId,
            attendanceSettledAt: null,
            $and: [
                { meetAt: crew.meetAt },
                { meetAt: { $lte: now, $gte: new Date(now.getTime() - ATTENDANCE_DEADLINE_MS) } }
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
    return recordCheckIn(crewId, userId, now, { token });
}

async function checkInAsHost(crewId, userId, position, now = new Date()) {
    return recordCheckIn(crewId, userId, now, { position });
}

async function recordCheckIn(crewId, userId, now, { token, position }) {
    const { crew, isOwner } = await access(crewId, userId);
    if (!token && !isOwner) throw fail(403, '모임장만 위치로 출석할 수 있어요.');
    if (!isOpen(crew, now)) throw fail(409, '모임 시작 후 30분까지만 출석할 수 있습니다.');
    const existingRecord = (crew.attendanceRecords || []).find((record) => id(record.user) === id(userId));
    if (existingRecord || (crew.attender || []).some((attender) => id(attender) === id(userId))) {
        return { alreadyAttended: true, attendanceStatus: existingRecord?.status || 'present', scoreDelta: 0 };
    }
    if (!token) requireNearbyPosition(position, crew.address);
    const proofFilter = token
        ? { attendanceQrHash: hash(token), attendanceQrExpiresAt: { $gt: now } }
        : {
            host: userId,
            'address.lat': crew.address.lat,
            'address.lng': crew.address.lng
        };
    const status = attendanceStatus(crew.meetAt, now);
    const scoreDelta = attendanceScoreDelta(status);
    const session = await Crew.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            result = await Crew.updateOne(
                {
                    _id: crewId,
                    meetAt: token
                        ? { $lte: now, $gte: new Date(now.getTime() - ATTENDANCE_DEADLINE_MS) }
                        : crew.meetAt,
                    attendanceSettledAt: null,
                    $or: [
                        { host: userId },
                        { 'member.memberList': { $elemMatch: { user: userId, status: 'confirmed' } } }
                    ],
                    attender: { $ne: userId },
                    attendanceRecords: { $not: { $elemMatch: { user: userId } } },
                    ...proofFilter
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
        if (latest?.attender?.some((attender) => id(attender) === id(userId))) {
            return { alreadyAttended: true, attendanceStatus: status, scoreDelta: 0 };
        }
        throw fail(409, token
            ? 'QR이 만료되었거나 참가 정보가 변경되었습니다. 새 QR로 시도해주세요.'
            : '모임 정보가 변경됐어요. 새로고침한 뒤 다시 시도해주세요.');
    }
    return { alreadyAttended: false, attendanceStatus: status, scoreDelta };
}

async function findMemberNames(memberIds) {
    return User.find({ _id: { $in: memberIds } }).select('name').lean();
}
module.exports = { access, findMemberNames, issueQr, checkIn, checkInAsHost };
