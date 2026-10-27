const crypto = require('crypto');
const Activity = require('../../models/crewActivity');
const Crew = require('../../models/regularCrew');
const User = require('../../models/User');

const fail = (status, message) => Object.assign(new Error(message), { status });
const id = (value) => String(value?._id || value);
const dateKey = (value) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(value));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ON_TIME_MS = 10 * 60 * 1000;
const ATTENDANCE_DEADLINE_MS = 30 * 60 * 1000;
const ATTENDANCE_SCORE_DELTA = Object.freeze({ present: 1, late: -1, absent: -2 });
function attendanceStatus(startTime, checkedInAt) {
    const elapsed = new Date(checkedInAt).getTime() - new Date(startTime).getTime();
    if (elapsed <= ON_TIME_MS) return 'present';
    if (elapsed <= ATTENDANCE_DEADLINE_MS) return 'late';
    return 'absent';
}
function attendanceDeadline(startTime) {
    return new Date(new Date(startTime).getTime() + ATTENDANCE_DEADLINE_MS);
}
function attendanceScoreDelta(status) {
    return ATTENDANCE_SCORE_DELTA[status] || 0;
}
function requireId(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
        throw fail(400, '올바르지 않은 모임 또는 활동입니다.');
}
function monthInfo(value = dateKey(new Date()).slice(0, 7)) {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) ||
        +value.slice(0, 4) < 2000 ||
        +value.slice(0, 4) > 2100
    )
        throw fail(400, '올바른 연월을 선택해주세요.');
    const [year, month] = value.split('-').map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const adjacent = (delta) =>
        new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
    return {
        key: value,
        year,
        month,
        days,
        offset,
        previous: adjacent(-1),
        next: adjacent(1),
        start: new Date(`${value}-01T00:00:00+09:00`),
        end: new Date(`${adjacent(1)}-01T00:00:00+09:00`)
    };
}
function validDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw fail(400, '올바른 날짜를 선택해주세요.');
    const month = monthInfo(value.slice(0, 7));
    if (+value.slice(8) < 1 || +value.slice(8) > month.days)
        throw fail(400, '올바른 날짜를 선택해주세요.');
    return value;
}
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
function participants(activity) {
    return [...new Set([...(activity.teamBlue || []), ...(activity.teamRed || [])].map(id))];
}
function attendanceWindow(activity) {
    return {
        start: new Date(activity.startTime),
        end: activity.endTime
            ? new Date(activity.endTime)
            : new Date(
                  new Date(`${dateKey(activity.startTime)}T00:00:00+09:00`).getTime() + 86400000
              )
    };
}
function isOpen(activity, now = new Date()) {
    const { start } = attendanceWindow(activity);
    return activity.status !== '종료' && now >= start && now <= attendanceDeadline(start);
}
async function issueQr(crewId, activityId, userId, now = new Date()) {
    const { isOwner } = await access(crewId, userId);
    if (!isOwner) throw fail(403, '모임장만 QR을 생성할 수 있습니다.');
    const activity = await activityFor(crewId, activityId);
    if (!isOpen(activity, now))
        throw fail(409, '활동 시작 후 30분까지만 QR을 생성할 수 있습니다.');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
        Math.min(now.getTime() + 60000, attendanceDeadline(activity.startTime).getTime())
    );
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
    await access(crewId, userId);
    const activity = await activityFor(crewId, activityId);
    if (!participants(activity).includes(id(userId)))
        throw fail(403, '이 활동에 참가 신청한 멤버만 출석할 수 있습니다.');
    if (!isOpen(activity, now)) throw fail(409, '활동 시작 후 30분까지만 출석할 수 있습니다.');
    const existingRecord = (activity.attendanceRecords || []).find((record) => id(record.user) === id(userId));
    if (existingRecord || (activity.attender || []).some((attender) => id(attender) === id(userId))) {
        return { alreadyAttended: true, attendanceStatus: existingRecord?.status || 'present', scoreDelta: 0 };
    }
    const status = attendanceStatus(activity.startTime, now);
    const scoreDelta = attendanceScoreDelta(status);
    // 참가 여부, 만료와 QR 교체를 쓰기 시점에도 확인하고 중복 등록을 막는다.
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
                    startTime: { $lte: now, $gte: new Date(now.getTime() - ATTENDANCE_DEADLINE_MS) },
                    $or: [{ teamBlue: userId }, { teamRed: userId }],
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
        const latest = await Activity.findById(activityId).select('attender');
        if (latest?.attender.some((attender) => id(attender) === id(userId))) {
            return { alreadyAttended: true, attendanceStatus: status, scoreDelta: 0 };
        }
        throw fail(409, '만료되거나 교체된 QR입니다. 모임장의 새 QR을 스캔해주세요.');
    }
    return { alreadyAttended: false, attendanceStatus: status, scoreDelta };
}
module.exports = {
    fail,
    id,
    hash,
    requireId,
    access,
    activityFor,
    dateKey,
    monthInfo,
    validDay,
    participants,
    isOpen,
    attendanceStatus,
    attendanceDeadline,
    attendanceScoreDelta,
    issueQr,
    checkIn
};
