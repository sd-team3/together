const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');

const RegularCrew = require('../models/regularCrew'); 
const InstantCrew = require('../models/instantCrew');
const User        = require('../models/User');

const SPORTS_META = {
    soccer:      { emoji: '⚽', color: '#1A5CFF' },
    baseball:    { emoji: '⚾', color: '#FF5500' },
    basketball:  { emoji: '🏀', color: '#FF8C00' },
    bowling:     { emoji: '🎳', color: '#8B00FF' },
    tennis:      { emoji: '🎾', color: '#00A86B' },
    badminton:   { emoji: '🏸', color: '#FF1493' },
    tabletennis: { emoji: '🏓', color: '#00BFFF' },
    fitness: { emoji: '🏋️', color: '#E11D48' },
    running: { emoji: '🏃', color: '#16A34A' }
};

const DAY_MAP = {
    mon: '월', tue: '화', wed: '수',
    thu: '목', fri: '금', sat: '토', sun: '일', none: '미정'
};

const LEVEL_MAP = {
    low: '초급', mid: '중급', high: '고급', none: '누구나'
};

const FEATURED_COUNT = 10; 
const GRID_COUNT     = 40; 
const CANDIDATE_POOL = 200;

const WEIGHTS = { sport: 40, state: 20, city: 10, age: 15, time: 15 };

// 나이 버킷 전체 (이 전부가 들어있으면 '제한 없음'으로 간주)
const AGE_BUCKETS = ['10s', '20s', '30s', '40s', '50s', '60+'];

// D-day 계산
const calcDday = (date) => {
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-0';
    if (diff > 0)  return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
};

// 크루 1개를 카드 데이터로 변환 (정기모임/AI추천 공통 사용)
const formatMeetingCard = (crew) => {

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
        id: crew._id ? crew._id.toString() : '',   
        intro: crew.intro || '',                   
        sportLabel: CONSTANTS.SPORTS[crew.sport]?.kr || crew.sport,
        profileImage: crew.profileImage || '',
        approval: crew.isAutoAccept ? '자동 승인' : '모임장 승인',
        sportKey: crew.sport || '',               
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
};

// 정기모임 카드 
const getRegularMeetings = async (sport = '', limit = 15) => {
    const query = sport ? { sport } : {};

    const crews = await RegularCrew.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

    return crews.map(formatMeetingCard);
};

const getLatestMeetingsPage = async (cursor = '') => {
    const limit = 6;
    let query = {};
    if (cursor) {
        const [date, id] = cursor.split('_');
        const createdAt = new Date(date);
        if (!mongoose.isObjectIdOrHexString(id) || !Number.isFinite(createdAt.getTime())) {
            const error = new Error('잘못된 모임 목록 커서입니다.');
            error.status = 400;
            throw error;
        }
        query = { $or: [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: new mongoose.Types.ObjectId(id) } }
        ] };
    }
    const results = await RegularCrew.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1);
    const crews = results.slice(0, limit);
    const last = crews[crews.length - 1];
    return {
        meetings: crews.map(formatMeetingCard),
        nextCursor: results.length > limit
            ? `${last.createdAt.toISOString()}_${last._id}` : null
    };
};


// 지도 마커 
const getLeafletMatches = async () => {
    const crews = await InstantCrew.find().sort({ createdAt: -1 }).limit(20);

    return crews.map(crew => {
        const current = crew.member.memberList.length;
        const total   = crew.member.capacity;
        const meta    = SPORTS_META[crew.sport] || { emoji: '🏃', color: '#999' };

        return {
            title:   crew.title,
            addr:    crew.address.city,
            time:    '시간 미정', 
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

    const user = await User.findById(objectId).lean();

    const regularCrews = await RegularCrew.find({
        $or: [
            { _id: { $in: user?.crews || [] } }, 
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

    const instantCrews = await InstantCrew.find({
        $and: [
            { 'member.memberList.user': objectId }, 
            { meetAt: { $gte: now, $lte: sunday } }  
        ]
    }).lean();

    instantCrews.forEach(crew => {
        const meta     = SPORTS_META[crew.sport] || { emoji: '🏃', color: '#999' };
        const meetDate = new Date(crew.meetAt);     
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
    const user = await User.findById(userId);

    return {
        manner: user?.manner || 0,
        clubs: user?.crews?.length || 0
    };
};

// 플랫폼 통계
const getStats = async () => {
    const [weeklyMatches, activeClubs, regularMembers, instantMembers, totalUsers] = await Promise.all([
        InstantCrew.countDocuments(),
        RegularCrew.countDocuments(),
        RegularCrew.aggregate([
            { $group: { _id: null, total: { $sum: { $size: '$member.memberList' } } } }
        ]),
        InstantCrew.aggregate([
            { $group: { _id: null, total: { $sum: { $size: '$member.memberList' } } } }
        ]),
        User.countDocuments()
    ]);

    return {
        weeklyMatches,
        activeClubs,
        totalMembers: (regularMembers[0]?.total || 0) + (instantMembers[0]?.total || 0),
        totalUsers
    };
};

// 종목 칩
const getSportChips = () => {
    return Object.entries(CONSTANTS.SPORTS).map(([key, val], idx) => ({
        key,
        emoji: SPORTS_META[key]?.emoji || '🏃',
        label: val.kr,
        active: idx === 0
    }));
};

const getAgeBucket = (age) => {
    if (!age) return null;
    if (age < 20) return '10s';
    if (age < 30) return '20s';
    if (age < 40) return '30s';
    if (age < 50) return '40s';
    if (age < 60) return '50s';
    return '60+';
};

const isNoAgeLimit = (ageRange) =>
    !ageRange?.length ||
    ageRange.includes('all') ||
    AGE_BUCKETS.every(b => ageRange.includes(b));

const getCrewTimeLabels = (crew) => {
    const days = crew.day || [];
    const isWeekend = days.some(d => ['sat', 'sun'].includes(d));
    const isWeekday = days.some(d => !['sat', 'sun', 'none'].includes(d));

    const nextSchedule = (crew.schedule || [])
        .filter(s => new Date(s.date) > new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    let timeOfDay = null;
    if (nextSchedule) {
        const hour = new Date(nextSchedule.date).getHours();
        timeOfDay = hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁';
    }

    const labels = [];
    if (timeOfDay) {
        if (isWeekday) labels.push(`평일${timeOfDay}`);
        if (isWeekend) labels.push(`주말${timeOfDay}`);
    } else {
        ['오전', '오후', '저녁'].forEach(t => {
            if (isWeekday) labels.push(`평일${t}`);
            if (isWeekend) labels.push(`주말${t}`);
        });
    }
    return labels;
};

const scoreCrewForUser = (crew, user) => {
    let score = 0;
    const reasons = [];

    // 종목
    if (user.preferredSport?.some(sport => sport === crew.sport || sport === SPORTS_META[crew.sport]?.emoji)) {
        score += WEIGHTS.sport;
        reasons.push({ icon: '🎯', label: '선호 종목과 일치해요' });
    }

    // 지역
    if (user.address?.state && user.address.state === crew.address?.state) {
        score += WEIGHTS.state;
        if (user.address?.city && user.address.city === crew.address?.city) {
            score += WEIGHTS.city;
            reasons.push({ icon: '📍', label: '우리 동네 모임이에요' });
        } else {
            reasons.push({ icon: '📍', label: '가까운 지역이에요' });
        }
    }

    const userAgeBucket = getAgeBucket(user.age);
    if (isNoAgeLimit(crew.ageRange)) {
        score += WEIGHTS.age;
    } else if (userAgeBucket && crew.ageRange.includes(userAgeBucket)) {
        score += WEIGHTS.age;
        reasons.push({ icon: '🎂', label: '내 연령대에 맞아요' });
    }

    const crewTimeLabels = getCrewTimeLabels(crew);
    if (user.preferredTime?.some(t => crewTimeLabels.includes(t))) {
        score += WEIGHTS.time;
        reasons.push({ icon: '⏰', label: '선호 시간대와 딱 맞아요' });
    }

    return { score, reasons: reasons.slice(0, 3) }; 
}

const splitMeetings = (list, featuredCount = FEATURED_COUNT, gridCount = GRID_COUNT) => ({
    featured: list.slice(0, featuredCount),
    grid: list.slice(featuredCount, featuredCount + gridCount)
});

// AI 추천 정기모임 - 로그인 유저의 선호정보 기반 스코어링
// 반환: { featured: 상위 10개(왼쪽 캐러셀), grid: 그 다음 40개(오른쪽 그리드) }
const getAIRecommendedMeetings = async (
    userId,
    featuredCount = FEATURED_COUNT,
    gridCount = GRID_COUNT,
    sport = ''
) => {
    const total = featuredCount + gridCount;

    // 비로그인 / 유저 없음: 점수 없이 최신순
    const fallback = async () =>
        splitMeetings(await getRegularMeetings(sport, total), featuredCount, gridCount);

    if (!userId) return fallback();

    const user = await User.findById(userId).lean();
    if (!user) return fallback();

    const crews = await RegularCrew.find(sport ? { sport } : {})
        .sort({ createdAt: -1 })
        .limit(CANDIDATE_POOL);

    const ranked = crews
        .map(crew => ({ crew, ...scoreCrewForUser(crew, user) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, total)
        .map(({ crew, score, reasons }) => ({
            ...formatMeetingCard(crew),
            matchScore: score,
            matchReasons: reasons
        }));

    return splitMeetings(ranked, featuredCount, gridCount);
};

// AI 자연어 검색
const searchCrewsByAI = async (filter, limit = 20) => {
    const query = {};

    if (filter.sport) query.sport = filter.sport;
    if (filter.state) query['address.state'] = filter.state;
    if (filter.city) query['address.city'] = filter.city;
    if (filter.day && filter.day.length) query.day = { $in: filter.day };
    if (filter.ageRange) query.ageRange = { $in: [filter.ageRange, 'all'] };
    if (filter.keyword) {
        query.$or = [
            { title: { $regex: filter.keyword, $options: 'i' } },
            { intro: { $regex: filter.keyword, $options: 'i' } }
        ];
    }

    const crews = await RegularCrew.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

    return crews.map(formatMeetingCard);
};


module.exports = {
    getLatestMeetingsPage,
    getRegularMeetings,
    getAIRecommendedMeetings,
    searchCrewsByAI,
    getLeafletMatches,
    getMySchedule,
    getMyStats,
    getStats,
    getSportChips,
    getLiveFeed
};
