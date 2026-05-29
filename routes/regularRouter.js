const express = require('express');
const router = express.Router();
const regCrewController = require('../controllers/crewController/regCrewController');

// 정기모임 페이지
router.get('/', regCrewController.getRegular);

// 정기모임 API로 페이지
router.get('/api', regCrewController.getRegularAPI);

module.exports = router;