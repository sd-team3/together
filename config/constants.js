const SPORTS = {
    soccer: { kr: '축구' },
    baseball: { kr: '야구' },
    basketball: { kr: '농구' },
    bowling: { kr: '볼링' },
    tennis: { kr: '테니스' },
    badminton: { kr: '배드민턴' },
    tabletennis: { kr: '탁구' }
}

module.exports = {
    SPORTS: SPORTS,
    SPORTS_EN: Object.keys(SPORTS),
    SPORTS_KR: Object.values(SPORTS)
};