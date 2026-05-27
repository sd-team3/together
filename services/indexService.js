const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');

const RegularCrew = require('../models/regularCrew'); // 경로는 실제에 맞게
const InstantCrew = require('../models/instantCrew');
const User        = require('../models/User');

// 스포츠별 이모지/색상 (CONSTANTS.SPORTS에 없어서 여기서 관리)
const SPORTS_META = {
    soccer:      { emoji: '⚽', color: '#1A5CFF' },
    baseball:    { emoji: '⚾', color: '#FF5500' },
    basketball:  { emoji: '🏀', color: '#FF8C00' },
    bowling:     { emoji: '🎳', color: '#8B00FF' },
    tennis:      { emoji: '🎾', color: '#00A86B' },
    badminton:   { emoji: '🏸', color: '#FF1493' },
    tabletennis: { emoji: '🏓', color: '#00BFFF' }
};

// 요일 매핑
const DAY_MAP = {
    mon: '월', tue: '화', wed: '수',
    thu: '목', fri: '금', sat: '토', sun: '일', none: '미정'
};

// 레벨 매핑
const LEVEL_MAP = {
    low: '초급', mid: '중급', high: '고급', none: '누구나'
};

// D-day 계산
const calcDday = (date) => {
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-0';
    if (diff > 0)  return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
};

// // ── 정기모임 카드 ──────────────────────────────
const getRegularMeetings = async () => {
    const crews = await RegularCrew.find()
        .sort({ createdAt: -1 })
        .limit(12);

    return crews.map(crew => {

        const memberList = crew.member?.memberList || [];

        const current = memberList.length;
        const total = crew.member?.capacity || 0;

        const fillPct = total > 0
            ? Math.round((current / total) * 100)
            : 0;

        const meta = SPORTS_META[crew.sport] || {
            emoji: '🏃',
            color: '#999'
        };

        const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        const dayLabel = ALL_DAYS.every(d => (crew.day || []).includes(d))
            ? '매일'
            : (crew.day || []).every(d => d === 'none')
                ? '비정기'
                : (crew.day || []).map(d => DAY_MAP[d] || d).join('·');

        const isFull = current >= total;
        const isAlmost = fillPct >= 75;

        const nextSchedule = (crew.schedule || [])
            .filter(s => new Date(s.date) > new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

        const timeLabel = nextSchedule
            ? new Date(nextSchedule.date).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            })
            : '';

        const PERIOD_MAP = { week: '매주', '2week': '격주', month: '매월' };
        const periodLabel = PERIOD_MAP[crew.period] || '매주';

        return {
            emoji: meta.emoji,
            title: crew.title,
            schedule: dayLabel === '비정기' ? '비정기' : `${periodLabel} ${dayLabel}`,
            district: `${crew.address?.state || ''} ${crew.address?.city || ''}`.trim() || '지역 미정',
            

            filterTags: [
                crew.fee > 0 ? 'paid' : 'free',
                (crew.day || []).some(d =>
                    ['sat', 'sun'].includes(d)
                ) ? 'weekend' : 'weekday',
                isAlmost ? 'warn' : ''
            ].join(' ').trim(),

            pillType: isFull
                ? 'danger'
                : isAlmost
                    ? 'warn'
                    : 'success',

            pillLabel: isFull
                ? '마감'
                : isAlmost
                    ? '마감임박'
                    : '모집중',

            time: timeLabel,

            fee: crew.fee > 0
                ? `${crew.fee.toLocaleString()}원/회`
                : '무료',

            level: LEVEL_MAP[crew.level] || '누구나',

            fillPct,
            current,
            total,

            modalBody:
                `📍 ${crew.address?.city || ''} ${crew.address?.detail || ''} / ` +
                `${periodLabel} ${dayLabel} ${timeLabel} / ` +
                `${current}/${total}명 / ` +
                `${crew.fee > 0
                    ? crew.fee.toLocaleString() + '원/회'
                    : '무료'}`
        };
    });
};


// ── 지도 마커 (instantCrew) ────────────────────
const getLeafletMatches = async () => {
    const crews = await InstantCrew.find().sort({ createdAt: -1 }).limit(20);

    return crews.map(crew => {
        const current = crew.member.memberList.length;
        const total   = crew.member.capacity;
        const meta    = SPORTS_META[crew.sport] || { emoji: '🏃', color: '#999' };

        return {
            title:   crew.title,
            addr:    crew.address.city,
            time:    '시간 미정', // TODO: instantCrew에 meetingAt 필드 추가 후 교체
            members: `${current}/${total}명`,
            emoji:   meta.emoji,
            level:   '누구나',
            fee:     '무료',
            lat:     crew.address.lat,
            lng:     crew.address.lng,
            color:   meta.color
        };
    });
};

//실시간 피드
const getLiveFeed = async () => {

    const [instantCrews, regularCrews] = await Promise.all([
        InstantCrew.find()
            .sort({ createdAt: -1 })
            .limit(5),

        RegularCrew.find()
            .sort({ createdAt: -1 })
            .limit(5)
    ]);

    const instantFeed = instantCrews.map(c => ({
        text: `⚡ ${c.title} 번개모임 생성!`,
        time: getRelativeTime(c.createdAt),
        createdAt: c.createdAt
    }));

    const regularFeed = regularCrews.map(c => ({
        text: `🔁 ${c.title} 정기모임 모집 시작!`,
        time: getRelativeTime(c.createdAt),
        createdAt: c.createdAt
    }));

    return [...instantFeed, ...regularFeed]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);
};

//실시간 피드 업데이트
const getRelativeTime = (date) => {

    const now  = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);

    if (diff < 60) {
        return '방금 전';
    }

    const minutes = Math.floor(diff / 60);

    if (minutes < 60) {
        return `${minutes}분 전`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}시간 전`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days}일 전`;
    }

    const months = Math.floor(days / 30);

    if (months < 12) {
        return `${months}개월 전`;
    }

    const years = Math.floor(months / 12);

    return `${years}년 전`;
};


// 내 이번 주 일정
const getMySchedule = async (userId) => {

    const now    = new Date();
    const dow    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const DAY_KEY_MAP = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
    const objectId    = new mongoose.Types.ObjectId(userId);
    const schedules   = [];

    // ── 정기모임: user.crews 기준으로 조회 ──────
    const user = await User.findById(objectId).lean();

    const regularCrews = await RegularCrew.find({
        $or: [
            { _id: { $in: user?.crews || [] } }, // ✅ user.crews 기준
            { host: objectId }
        ]
    }).lean();

    for (const crew of regularCrews) {
        const meta = SPORTS_META[crew.sport] || { emoji: '🏃', color: '#999' };
        const days = (crew.day || []).filter(d => d !== 'none');
        if (!days.length) continue;

        const meetDates = [];

        if (crew.period === 'week') {
            days.forEach(dayKey => {
                const targetDow = DAY_KEY_MAP[dayKey];
                if (targetDow === undefined) return;
                const meetDate = new Date(monday);
                meetDate.setDate(monday.getDate() + (targetDow === 0 ? 6 : targetDow - 1));
                meetDates.push(meetDate);
            });

        } else if (crew.period === '2week') {
            const lastDate = (crew.schedule || [])
                .map(s => new Date(s.date))
                .sort((a, b) => b - a)[0];

            if (!lastDate) continue;

            days.forEach(dayKey => {
                const targetDow = DAY_KEY_MAP[dayKey];
                if (targetDow === undefined) return;
                let cursor = new Date(lastDate);
                while (cursor < monday) cursor.setDate(cursor.getDate() + 14);
                if (cursor <= sunday && cursor.getDay() === targetDow) {
                    meetDates.push(new Date(cursor));
                }
            });

        } else if (crew.period === 'month') {
            (crew.schedule || []).forEach(s => {
                const d = new Date(s.date);
                if (d >= monday && d <= sunday) meetDates.push(d);
            });
        }

        meetDates.forEach(meetDate => {
            if (meetDate < now) return;
            const dDay    = calcDday(meetDate);
            const isToday = meetDate.toDateString() === now.toDateString();

            schedules.push({
                date:   meetDate,
                time:   isToday
                    ? '오늘'
                    : meetDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }),
                emoji:  meta.emoji,
                title:  crew.title,
                place:  `${crew.address?.state || ''} ${crew.address?.city || ''}`.trim() || '장소 미정',
                dDay,
                dColor: dDay === 'D-0' ? 'var(--orange)' : 'var(--primary)',
                type:   'regular'
            });
        });
    }

    // ── 번개모임 ────────────────────────────────
    const instantCrews = await InstantCrew.find({
        $and: [
            { 'member.memberList.user': objectId },  // ✅ ObjectId 변환
            { meetAt: { $gte: now, $lte: sunday } }  // ✅ meetAt
        ]
    }).lean();

    instantCrews.forEach(crew => {
        const meta     = SPORTS_META[crew.sport] || { emoji: '🏃', color: '#999' };
        const meetDate = new Date(crew.meetAt);      // ✅ meetAt
        const dDay     = calcDday(meetDate);

        schedules.push({
            date:   meetDate,
            time:   meetDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }),
            emoji:  meta.emoji,
            title:  `⚡ ${crew.title}`,
            place:  `${crew.address?.state || ''} ${crew.address?.city || ''}`.trim() || '장소 미정',
            dDay,
            dColor: dDay === 'D-0' ? 'var(--orange)' : 'var(--primary)',
            type:   'instant'
        });
    });

    return schedules.sort((a, b) => a.date - b.date);
};

// 내 활동 요약
const getMyStats = async (userId) => {
    const user       = await User.findById(userId);
    const clubsCount = user?.crews?.length || 0;

    return {
        manner: user?.manner || 0,
        clubs: user?.crews?.length || 0
        
    };
};

// 플랫폼 통계
const getStats = async () => {
    const [weeklyMatches, activeClubs, regularMembers, instantMembers] = await Promise.all([
    InstantCrew.countDocuments(),
    RegularCrew.countDocuments(),
    RegularCrew.aggregate([
        { $group: { _id: null, total: { $sum: { $size: '$member.memberList' } } } }
    ]),
    InstantCrew.aggregate([
        { $group: { _id: null, total: { $sum: { $size: '$member.memberList' } } } }
    ])
]);

return {
    weeklyMatches,
    activeClubs,
    totalMembers: (regularMembers[0]?.total || 0) + (instantMembers[0]?.total || 0)
};
};

// 종목 칩
const getSportChips = () => {
    return Object.entries(CONSTANTS.SPORTS).map(([key, val], idx) => ({
        emoji:  SPORTS_META[key]?.emoji || '🏃',
        label:  val.kr,
        active: idx === 0
    }));
};



module.exports = {
    getRegularMeetings,
    getLeafletMatches,
    getMySchedule,
    getMyStats,
    getStats,
    getSportChips,
    getLiveFeed
};
