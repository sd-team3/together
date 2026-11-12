const crypto = require('crypto');
const QRCode = require('qrcode');
const {
    ON_TIME_MS, ATTENDANCE_DEADLINE_MS, HOST_ATTENDANCE_RADIUS_METERS,
    INSTANT_DURATION_MS, QR_LIFETIME_MS, ATTENDANCE_SCORE_DELTA
} = require('../config/attendance');

function fail(status, message) {
    return Object.assign(new Error(message), { status });
}

function id(value) {
    return String(value?._id || value);
}

function dateKey(value) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(value));
}

function hash(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

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

function validCoordinates({ lat, lng } = {}) {
    return Number.isFinite(lat) && Math.abs(lat) <= 90 &&
        Number.isFinite(lng) && Math.abs(lng) <= 180;
}

function requireNearbyPosition(position, venue) {
    if (!position || !validCoordinates(position) || !Number.isFinite(position.accuracy) ||
        position.accuracy < 0 || position.accuracy > HOST_ATTENDANCE_RADIUS_METERS) {
        throw fail(400, '위치를 정확히 확인하지 못했어요. 다시 시도해주세요.');
    }
    if (!venue || !validCoordinates(venue)) throw fail(409, '모임 장소의 좌표를 확인할 수 없어요.');

    const radians = Math.PI / 180;
    const halfLat = (position.lat - venue.lat) * radians / 2;
    const halfLng = (position.lng - venue.lng) * radians / 2;
    const a = Math.sin(halfLat) ** 2 +
        Math.cos(venue.lat * radians) * Math.cos(position.lat * radians) * Math.sin(halfLng) ** 2;
    const distance = 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, a)));
    if (distance > HOST_ATTENDANCE_RADIUS_METERS) {
        throw fail(400, '모임 장소에서 50m 이내로 이동한 뒤 다시 시도해주세요.');
    }
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

function instantActivity(crew) {
    return {
        _id: crew._id,
        title: crew.title,
        startTime: crew.meetAt,
        endTime: new Date(new Date(crew.meetAt).getTime() + INSTANT_DURATION_MS),
        location: crew.address
    };
}

function instantIsOpen(crew, now = new Date()) {
    return isOpen(instantActivity(crew), now);
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

function createQrToken(startTime, now) {
    return {
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Math.min(now.getTime() + QR_LIFETIME_MS, attendanceDeadline(startTime).getTime()))
    };
}

async function createQrImage(path, base, token) {
    const url = new URL(path, base);
    url.hash = `token=${token}`;
    return QRCode.toDataURL(url.href, { width: 280, margin: 2 });
}

function groupActivitiesByDate(activities) {
    const dates = {};
    for (const activity of activities) {
        const key = dateKey(activity.startTime);
        (dates[key] ||= []).push(activity);
    }
    return dates;
}

function selectActivity(activities, activityId) {
    const activity = activityId ? activities.find(item => String(item._id) === activityId) : activities[0];
    if (activityId && !activity) throw fail(404, '이 날짜의 활동이 아닙니다.');
    return activity;
}

function addMemberNames(members, users) {
    const names = new Map(users.map(user => [id(user), user.name]));
    return members.map(member => ({ ...member, name: names.get(member.id) || '탈퇴한 멤버' }));
}

function regularRoster(activity) {
    const attended = new Set((activity?.attender || []).map(id));
    const records = new Map((activity?.attendanceRecords || []).map(record => [id(record.user), record]));
    return (activity ? participants(activity) : []).map(userId => {
        const record = records.get(userId);
        const status = record?.status || (attended.has(userId) ? 'present' : activity.attendanceSettledAt ? 'absent' : 'pending');
        return { id: userId, status, attended: status === 'present' || status === 'late' || attended.has(userId) };
    });
}
module.exports = {
    fail, id, hash, dateKey, requireId, monthInfo, validDay,
    attendanceStatus, attendanceDeadline, attendanceScoreDelta, requireNearbyPosition,
    participants, isOpen, instantActivity, instantIsOpen, roster,
    createQrToken, createQrImage, groupActivitiesByDate, selectActivity, addMemberNames, regularRoster
};
