// JSON API는 로그인 페이지로 이동하는 대신 오류 상태와 메시지를 반환한다.
function loginValidation(message) {
    return (req, res, next) => {
        if (!req.isAuthenticated()) return res.status(401).json({ message });
        next();
    };
}

// 요청별 추가 헤더 검사는 유지하면서 JSON 형식과 외부 사이트 요청을 공통으로 검사한다.
function jsonRequestValidation({ message, shouldValidate = () => true, validateHeader = () => true }) {
    return (req, res, next) => {
        if (shouldValidate(req) && (
            !req.is('application/json') ||
            req.get('Sec-Fetch-Site') === 'cross-site' ||
            !validateHeader(req)
        )) {
            return res.status(403).json({ message });
        }
        next();
    };
}

const recordLoginValidation = loginValidation('다시 로그인한 뒤 저장해주세요.');

const recordSaveValidation = jsonRequestValidation({
    message: '운동 기록 화면에서 다시 저장해주세요.'
});

const attendanceRequestValidation = jsonRequestValidation({
    message: '페이지를 새로고침한 후 다시 시도해주세요.',
    shouldValidate: req => req.method === 'POST',
    validateHeader: req => req.get('X-Attendance-CSRF') === req.session.attendanceCsrf
});

const apiLoginValidation = loginValidation('로그인이 필요합니다.');
const webPushLoginValidation = apiLoginValidation;

const webPushRequestValidation = jsonRequestValidation({
    message: '설정 화면에서 다시 시도해주세요.',
    shouldValidate: req => req.method !== 'GET',
    validateHeader: req => req.get('X-Together-Push') === '1'
});

function noStore(req, res, next) {
    res.set('Cache-Control', 'no-store');
    next();
}

module.exports = {
    recordLoginValidation, recordSaveValidation, attendanceRequestValidation,
    apiLoginValidation, webPushLoginValidation, webPushRequestValidation, noStore
};
