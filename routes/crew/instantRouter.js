const express = require('express');
const router = express.Router();
const instantCrew = require('../../models/instantCrew');
const instantController = require('../../controllers/crew/instantController');
const applicationController = require('../../controllers/crew/applicationController');
const crewMiddleware = require('../../middlewares/crewMiddleware');

router.use((req, res, next)=>{ 
    req.crewModel = instantCrew;
    req.crewType = 'instantCrew';
    next(); 
});

//번개 모임 페이지
router.get('/list', instantController.getInstant);

//모임 만들기
router.get('/create', 
    crewMiddleware.loginValidation, 
    instantController.getInstantCreate
);
router.post('/create', 
    crewMiddleware.loginValidation, 
    instantController.postInstantCreate
);


router.get('/list/:instantId',  
    instantController.getInstantDetail
);

//모임 삭제
router.post('/delete/:instantId', 
    crewMiddleware.loginValidation, 
    instantController.deleteInstantCrew
);

//크루 강퇴
router.post('/list/:instantId/kick/:userId', 
    crewMiddleware.loginValidation, 
    instantController.kickMember
);

router.post('/application/:crewId', 
    crewMiddleware.loginValidation,
    crewMiddleware.applicationValidation,
    applicationController.postApplication
);

router.post('/pending/:crewId', 
    crewMiddleware.loginValidation,
    crewMiddleware.getPendingValidation,
    applicationController.getPendingApps
);

router.post('/join/:appId/:action',
    crewMiddleware.loginValidation,
    crewMiddleware.joinMiddleware,
    applicationController.joinProcess
);

router.get('/api/:instantId', instantController.getInstantDetailApi);

//노쇼
router.post('/list/:instantId/noshow/:userId', crewMiddleware.loginValidation, instantController.setNoshow);

module.exports = router;