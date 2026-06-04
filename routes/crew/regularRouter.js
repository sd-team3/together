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
    crewMiddleware.loginValidation,
    regularController.getRegularCreate
);

router.post('/create',
    uploadRegularProfile.single('uploadFile'),
    crewMiddleware.loginValidation,
    crewMiddleware.regularCreateMiddleware,
    regularController.postRegularCreate
);

router.post('/delete/:crewId',
    crewMiddleware.loginValidation,
    regularController.postMyCrewDelete
);

router.post('/withdraw/:crewId', 
    crewMiddleware.loginValidation,
    regularController.postMyCrewWithdraw
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
    crewMiddleware.joinMiddleware,
    applicationController.joinProcess
);

router.get('/my-crews', regularController.getMyCrews);
router.get('/list', regularController.getRegular);
router.get('/list/:crewId', regularController.getRegularPage);

router.get('/api', regularController.getRegularAPI);





router.get('/:regularCrewId', regularController.getCrewDetail);
router.post('/:regularCrewId/like', regularController.postCrewLike);

module.exports = router;