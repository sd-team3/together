const express = require('express');
const router = express.Router();
const regularCrew = require('../../models/regularCrew');
const regularController = require('../../controllers/crew/regularController');
const applicationController = require('../../controllers/crew/applicationController');
const applicationService = require('../../services/crew/applicationService');
const crewMiddleware = require('../../middlewares/crewMiddleware');
const { uploadRegularProfile } = require('../../config/upload');

router.use((req, res, next)=>{ 
    req.crewModel = regularCrew;
    next(); 
});

router.get('/create', 
    crewMiddleware.isLogin,
    regularController.getRegularCreate
);

router.post('/create',
    uploadRegularProfile.single('uploadFile'),
    crewMiddleware.isLogin,
    crewMiddleware.regularCreateMiddleware,
    regularController.postRegularCreate
);

router.post('/delete/:crewId',
    crewMiddleware.isLogin,
    regularController.postMyCrewDelete
);

router.post('/withdraw/:crewId', 
    crewMiddleware.isLogin,
    regularController.postMyCrewWithdraw
);


router.post('/application/:crewId', 
    crewMiddleware.isLogin,
    crewMiddleware.applicationValidation,
    applicationController.postApplication
);

console.log({
    isLogin: typeof crewMiddleware.isLogin,
    isHost: typeof crewMiddleware.isHost,
    isCrewExist: typeof crewMiddleware.isCrewExist,
    getPendingApps: typeof applicationController.getPendingApps
});

router.get('/pending/:crewId', 
    crewMiddleware.isLogin,
    crewMiddleware.isHost,
    crewMiddleware.isCrewExist,
    applicationController.getPendingApps
);

router.get('/relation/:crewId/:userId', 
    crewMiddleware.isLogin,
    applicationController.getRelation
);

router.post('/join/:appId/:action',
    crewMiddleware.joinMiddleware,
    applicationController.joinProcess
);

router.get('/my', regularController.getMyCrews);
router.get('/list', regularController.getRegular);
router.get('/list/:crewId', regularController.getRegularPage);

router.get('/api', regularController.getRegularAPI);

router.get('/manage/:regularCrewId', regularController.getCrewManage);
router.get('/api/my', regularController.getMyCrewsApi);

router.get('/activity/:regularCrewId', regularController.getCrewActivity);
router.post('/list/:crewID/like', regularController.postCrewLike);

module.exports = router;