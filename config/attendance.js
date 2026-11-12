module.exports = {
    ON_TIME_MS: 10 * 60 * 1000,
    ATTENDANCE_DEADLINE_MS: 30 * 60 * 1000,
    HOST_ATTENDANCE_RADIUS_METERS: 50,
    INSTANT_DURATION_MS: 3 * 60 * 60 * 1000,
    QR_LIFETIME_MS: 60 * 1000,
    ATTENDANCE_SCORE_DELTA: Object.freeze({ present: 1, late: -1, absent: -2 })
};
