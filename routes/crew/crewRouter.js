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

router.get('/instant-create', instantCrewController.getInstantCreate);
router.post('/instant-create', instantCrewController.postInstantCreate);
module.exports = router;