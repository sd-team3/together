const express = require('express');
const router = express.Router();
const regCrewController = require('../../controllers/crewController/regCrewController');
const applicationController = require('../../controllers/crewController/applicationController');
const applicationService = require('../../services/crew/applicationService');
const { uploadRegCrewProfile } = require('../../config/upload');

router.get('/reg-create', regCrewController.getRegCreate);
router.post('/reg-create',
    uploadRegCrewProfile.single('uploadFile'),
    regCrewController.postRegCreate
);

router.get('/test', (req, res)=>{
    res.render('crew/test');
});
router.post('/application', applicationController.postApplication);

router.post('/pending-application', async (req, res)=>{
    try {
        const { crewId } = req.body;
        const pendingApplications = await applicationService.findPendingApplicationsByCrewId(crewId);
        res.json(pendingApplications);
    } catch (error) {
        res.status(500).json({ message: 'regularRouter' });
    }
});

module.exports = router;