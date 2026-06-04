const express = require('express');
const router = express.Router();
const regularController = require('../../controllers/crew/regularController');
const applicationController = require('../../controllers/crew/applicationController');
const applicationService = require('../../services/crew/applicationService');
const crewMiddleware = require('../../middlewares/crewMiddleware');
const { uploadRegularProfile } = require('../../config/upload');

router.use((req, res, next)=>{ req.crewType = 'regular'; next(); })

router.get('/create', regularController.getRegCreate);
router.post('/create',
    uploadRegularProfile.single('uploadFile'),
    regularController.postRegCreate
);

router.post('/application', 
    crewMiddleware.applicationValidation,
    applicationController.postApplication
);

// router.post('/pending-application', applicationController.getPendingApplication);

// router.post('/join/:crewId/:appUserId/:action',
//     crewMiddleware.joinProcessValidation,
//     applicationController.postJoinProcess
// );

router.get('/my-crews', regularController.getMyCrews);
router.get('/regular', regularController.getRegular);

router.get('/api', regularController.getRegularAPI);


router.post('/delete/:regularCrewId', regularController.postMyCrewDelete);
router.post('/withdraw/:regularCrewId', regularController.postMyCrewWithdraw);

router.get('/manage/:regularCrewId', regularController.getCrewManage);
router.get('/api/my-crews', regularController.getMyCrewsApi);

router.get('/:regularCrewId', regularController.getCrewDetail);
router.post('/:regularCrewId/like', regularController.postCrewLike);

module.exports = router;