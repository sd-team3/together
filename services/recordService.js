const Record = require('../models/Record');

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
        .select('_id sport exerciseDate mood good improve goal')
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
    getMyRecords
};
