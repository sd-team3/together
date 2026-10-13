const express = require('express'); 
const router = express.Router();
const crewMiddleware = require('../middlewares/crewMiddleware');
const recordController = require('../controllers/recordController');

router.get('/activities', crewMiddleware.loginValidation, recordController.getMyActivities);

router.post('/', (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: '다시 로그인한 뒤 저장해주세요.' });
    // JSON 요청만 받아 외부 페이지의 폼 제출로 기록이 생성되지 않게 한다.
    if (!req.is('application/json') || req.get('Sec-Fetch-Site') === 'cross-site') {
        return res.status(403).json({ message: '운동 기록 화면에서 다시 저장해주세요.' });
    }
    next();
}, recordController.createRecord);

router.get('/',
    crewMiddleware.loginValidation,
    recordController.getRecordWrite
)

module.exports = router;
