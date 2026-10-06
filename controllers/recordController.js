const recordService = require('../services/recordService');
const { CONSTANTS } = require('../config/constants');

const getRecordWrite = async (req, res, next) => {
    try {
        const requestedPage = Number(req.query.page);
        const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? requestedPage
            : 1;
        const sport = Object.hasOwn(CONSTANTS.SPORTS, req.query.sport)
            ? req.query.sport
            : '';

        // 주소에서 받은 ID 대신 인증된 사용자의 ID로 조회한다.
        const result = await recordService.getMyRecords(req.user._id, page, sport);

        // script 태그에 JSON을 넣을 때 사용자 입력이 HTML로 해석되지 않게 한다.
        const recordsJson = JSON.stringify(result.records).replace(/</g, '\\u003c');

        res.render('record/record-preview', {
            ...result,
            sports: CONSTANTS.SPORTS,
            selectedSport: sport,
            recordsJson
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getRecordWrite
}
