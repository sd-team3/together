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

module.exports = router;