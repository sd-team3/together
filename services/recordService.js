const Record = require('../models/Record');
const CrewActivity = require('../models/crewActivity');
const RegularCrew = require('../models/regularCrew');
const InstantCrew = require('../models/instantCrew');

function badRequest(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

async function createRecord(userId, input) {
    if (!input || typeof input !== 'object'
        || typeof input.crewKey !== 'string' || !/^(regular|instant):[a-f\d]{24}$/i.test(input.crewKey)
        || typeof input.activityId !== 'string' || !/^[a-f\d]{24}$/i.test(input.activityId)
        || typeof input.submissionId !== 'string'
        || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.submissionId)) {
        throw badRequest('모임과 날짜를 다시 선택해주세요.');
    }
    if (!Number.isInteger(input.mood) || input.mood < 1 || input.mood > 5) {
        throw badRequest('오늘 운동의 만족도를 선택해주세요.');
    }
    const notes = {};
    for (const field of ['good', 'improve', 'goal']) {
        const value = input[field] ?? '';
        if (typeof value !== 'string' || value.length > 1000) {
            throw badRequest('각 회고 항목은 1,000자 이하로 입력해주세요.');
        }
        notes[field] = value.trim();
    }
    const existing = await Record.findOne({ user: userId, submissionId: input.submissionId });
    if (existing) return existing;

    // 클라이언트가 보낸 작성자·종목·날짜·모임명은 신뢰하지 않는다.
    const activities = await getMyActivities(userId);
    const activity = activities.find(item => item.id === input.activityId && item.crewKey === input.crewKey);
    if (!activity) throw badRequest('참여가 확인된 모임만 기록할 수 있어요. 모임을 다시 선택해주세요.', 403);
    const [crewType, crewId] = activity.crewKey.split(':');
    try {
        return await Record.create({
            user: userId, submissionId: input.submissionId,
            crewType, crewId, activityId: activity.id,
            crewTitle: activity.crewTitle, activityTitle: activity.title,
            sport: activity.sport, exerciseDate: activity.date, mood: input.mood, ...notes
        });
    } catch (error) {
        if (error.code === 11000) {
            const saved = await Record.findOne({ user: userId, submissionId: input.submissionId });
            if (saved) return saved;
            throw badRequest('저장 요청이 충돌했어요. 목록으로 돌아가 다시 작성해주세요.', 409);
        }
        throw error;
    }
}

async function getRecordPage(userId, record) {
    const precedingCount = await Record.countDocuments({ user: userId, $or: [
        { exerciseDate: { $gt: record.exerciseDate } },
        { exerciseDate: record.exerciseDate, _id: { $gt: record._id } }
    ] });
    return Math.floor(precedingCount / 9) + 1;
}

// 정기 모임은 출석 확인, 번개 모임은 확정된 참여 내역을 기준으로 한다.
async function getMyActivities(userId) {
    const now = new Date();
    const [activities, instantCrews] = await Promise.all([
        CrewActivity.find({ crewModel: 'regular', attender: userId, startTime: { $lte: now } })
            .select('_id crewId title startTime')
            .populate({ path: 'crewId', model: RegularCrew, select: 'title sport' }).lean(),
        InstantCrew.find({ meetAt: { $lte: now }, $or: [
            { host: userId },
            { 'member.memberList': { $elemMatch: { user: userId, status: 'confirmed' } } }
        ] }).select('_id title sport meetAt').lean()
    ]);
    const dateFormat = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    return [
        ...activities.filter(activity => activity.crewId).map(activity => ({
            id: String(activity._id), crewKey: `regular:${activity.crewId._id}`,
            crewTitle: activity.crewId.title, title: activity.title,
            sport: activity.crewId.sport, date: dateFormat.format(activity.startTime), type: '정기 모임'
        })),
        ...instantCrews.map(crew => ({
            id: String(crew._id), crewKey: `instant:${crew._id}`,
            crewTitle: crew.title, title: crew.title,
            sport: crew.sport, date: dateFormat.format(crew.meetAt), type: '번개 모임'
        }))
    ].sort((a, b) => b.date.localeCompare(a.date));
}

async function getMyRecords(userId, page = 1, sport = '') {
    const userQuery = { user: userId };
    const query = { ...userQuery };

    if (sport) {
        query.sport = sport;
    }
    
    const limit = 9;

    const totalRecords = await Record.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);
    const currentPage = Math.min(page, Math.max(totalPages, 1));

    // 목록은 한 페이지씩, 상단 집계는 전체 개인 기록을 기준으로 조회한다.
    const records = await Record.find(query)
        .select('_id sport exerciseDate mood good improve goal crewTitle activityTitle')
        .sort({ exerciseDate: -1, _id: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .lean();

    const allRecordCount = sport
        ? await Record.countDocuments(userQuery)
        : totalRecords;
    const recordedSports = await Record.distinct('sport', userQuery);

    return {
        records,
        currentPage,
        totalPages,
        totalRecords,
        allRecordCount,
        sportCount: recordedSports.length
    };
}

module.exports = {
    getMyRecords,
    getMyActivities,
    createRecord,
    getRecordPage
};
