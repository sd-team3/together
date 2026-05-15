const express = require('express');
const router = express.Router();
const regCrewController = require('../../controllers/crewController/regCrewController');
const instantCrewController = require('../../controllers/crewController/instantCrewController');
const { uploadRegCrewProfile } = require('../../config/upload');

router.get('/reg-create', regCrewController.getRegCreate);
router.post('/reg-create',
    uploadRegCrewProfile.single('uploadFile'),
    regCrewController.postRegCreate
);

// 번개모임 페이지
router.get('/instant', instantCrewController.getInstant);

//번개모입 만들기
router.get('/instant-create', instantCrewController.getInstantCreate);
router.post('/instant-create', instantCrewController.postInstantCreate);

//번개모임 참가 신청
router.post('/instant/:crewId/apply', instantCrewController.postApplyInstantCrew);
module.exports = router;