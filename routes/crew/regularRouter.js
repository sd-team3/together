const express = require('express');
const router = express.Router();
const regCrewController = require('../../controllers/crewController/regCrewController');
const applicationController = require('../../controllers/crewController/applicationController');
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

module.exports = router;