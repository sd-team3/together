const express = require('express');
const router = express.Router();
const regCrewController = require('../../controllers/crewController/regCrewController');
const instantCrewController = require('../../controllers/crewController/instantCrewController');
const { uploadRegCrewProfile } = require('../../config/upload');

// 정기모임
router.get('/reg-create', regCrewController.getRegCreate);
router.get('/my-crews', regCrewController.getMyCrews);

// 번개모임
router.get('/instant', instantCrewController.getInstant);

// 정기모임 페이지 만들기
router.post('/reg-create',
    uploadRegCrewProfile.single('uploadFile'),
    regCrewController.postRegCreate
);
router.post('/delete/:regularCrewId', regCrewController.postMyCrewDelete);
router.post('/withdraw/:regularCrewId', regCrewController.postMyCrewWithdraw);

// 번개모임 페이지 만들기
router.get('/instant-create', instantCrewController.getInstantCreate);
router.post('/instant-create', instantCrewController.postInstantCreate);

router.get('/:regularCrewId', regCrewController.getCrewDetail);
router.post('/:regularCrewId/like', regCrewController.postCrewLike);
module.exports = router;