const express = require('express');
const router = express.Router();
const instantController = require('../../controllers/crew/instantController');
const applicationController = require('../../controllers/crew/applicationController');
const applicationService = require('../../services/crew/applicationService');
const crewMiddleware = require('../../middlewares/crewMiddleware');
const { uploadRegularProfile } = require('../../config/upload');

//번개 모임 페이지
router.get('/instant', instantController.getInstant);

//모임 만들기
router.get('/create', instantController.getInstantCreate);
router.post('/create', instantController.postInstantCreate);


router.get('/list/:instantId', instantController.getInstantDetail);

//모임 삭제
router.post('/delete/:instantId', instantController.deleteInstantCrew);

//크루 강퇴
router.post('/list/:instantId/kick/:userId', instantController.kickMember);
module.exports = router;