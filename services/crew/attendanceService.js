const Activity = require('../../models/crewActivity');
const Crew = require('../../models/regularCrew');
const User = require('../../models/User');
const { ATTENDANCE_DEADLINE_MS } = require('../../config/attendance');
const { fail, id, hash, requireId, participants, isOpen, attendanceStatus, attendanceDeadline, attendanceScoreDelta, requireNearbyPosition, createQrToken } = require('../../utils/attendanceUtils');

async function access(crewId, userId) {
    requireId(crewId);
    const crew = await Crew.findById(crewId).lean();
    if (!crew) throw fail(404, '모임을 찾을 수 없습니다.');
    const isOwner = id(crew.host) === id(userId);
    if (!isOwner && !crew.member.memberList.some((member) => id(member.user) === id(userId)))
        throw fail(403, '모임원만 출석부를 볼 수 있습니다.');
    return { crew, isOwner };
}

async function activityFor(crewId, activityId) {
    requireId(activityId);
    const activity = await Activity.findOne({ _id: activityId, crewId, crewModel: 'regular' });
    if (!activity) throw fail(404, '이 모임의 활동을 찾을 수 없습니다.');
    return activity;
}

async function issueQr(crewId, activityId, userId, now = new Date()) {
    const { isOwner } = await access(crewId, userId);
    if (!isOwner) throw fail(403, '모임장만 QR을 생성할 수 있습니다.');
    const activity = await activityFor(crewId, activityId);
    if (!isOpen(activity, now))
        throw fail(409, '활동 시작 후 30분까지만 QR을 생성할 수 있습니다.');
    const { token, expiresAt } = createQrToken(activity.startTime, now);
    const updated = await Activity.updateOne(
        {
            _id: activityId,
            crewId,
            status: { $ne: '종료' },
            attendanceSettledAt: null,
            startTime: { $lte: now, $gte: new Date(now.getTime() - ATTENDANCE_DEADLINE_MS) }
        },
        { $set: { attendanceQrHash: hash(token), attendanceQrExpiresAt: expiresAt, attendancePolicyEnabled: true } }
    );
    if (!updated.matchedCount) throw fail(409, '이미 종료된 활동입니다.');
    return { token, expiresAt };
}

async function checkIn(crewId, activityId, userId, token, now = new Date()) {
    if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token))
        throw fail(400, 'QR을 다시 스캔해주세요.');
    return recordCheckIn(crewId, activityId, userId, now, { token });
}

async function checkInAsHost(crewId, activityId, userId, position, now = new Date()) {
    return recordCheckIn(crewId, activityId, userId, now, { position });
}

async function recordCheckIn(crewId, activityId, userId, now, { token, position }) {
    const { isOwner } = await access(crewId, userId);

    if (!token && !isOwner) throw fail(403, '모임장만 위치로 출석할 수 있어요.');

    const activity = await activityFor(crewId, activityId);

    if (!participants(activity).includes(id(userId)))
        throw fail(403, '이 활동에 참가 신청한 멤버만 출석할 수 있습니다.');

    if (!isOpen(activity, now)) throw fail(409, '활동 시작 후 30분까지만 출석할 수 있습니다.');

    const existingRecord = (activity.attendanceRecords || []).find((record) => id(record.user) === id(userId));

    if (existingRecord || (activity.attender || []).some((attender) => id(attender) === id(userId))) {
        return { alreadyAttended: true, attendanceStatus: existingRecord?.status || 'present', scoreDelta: 0 };
    }

    if (!token) requireNearbyPosition(position, activity.location);

    const proofFilter = token
        ? { attendanceQrHash: hash(token), attendanceQrExpiresAt: { $gt: now } }
        : { 'location.lat': activity.location.lat, 'location.lng': activity.location.lng };

    const status = attendanceStatus(activity.startTime, now);
    const scoreDelta = attendanceScoreDelta(status);
    const session = await Activity.startSession();

    let result;
    try {
        await session.withTransaction(async () => {
            result = await Activity.updateOne(
                {
                    _id: activityId,
                    crewId,
                    crewModel: 'regular',
                    status: { $ne: '종료' },
                    attendanceSettledAt: null,
                    startTime: token
                        ? { $lte: now, $gte: new Date(now.getTime() - ATTENDANCE_DEADLINE_MS) }
                        : activity.startTime,
                    $or: [{ teamBlue: userId }, { teamRed: userId }],
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
        const latest = await Activity.findById(activityId).select('attender');
        
        if (latest?.attender?.some((attender) => id(attender) === id(userId))) {
            return { alreadyAttended: true, attendanceStatus: status, scoreDelta: 0 };
        }
        throw fail(409, token
            ? '만료되거나 교체된 QR입니다. 모임장의 새 QR을 스캔해주세요.'
            : '활동 정보가 변경됐어요. 새로고침한 뒤 다시 시도해주세요.');
    }
    return { alreadyAttended: false, attendanceStatus: status, scoreDelta };
}

async function findActivities(crewId, start, end) {
    return Activity.find({
        crewId,
        crewModel: 'regular',
        startTime: { $gte: start, $lt: end }
    }).sort({ startTime: 1 }).lean();
}

async function findMemberNames(memberIds) {
    return User.find({ _id: { $in: memberIds } }).select('name').lean();
}
module.exports = { access, activityFor, findActivities, findMemberNames, issueQr, checkIn, checkInAsHost };
