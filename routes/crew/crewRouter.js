const express = require('express');
const router = express.Router();
const regCrewController = require('../../controllers/crewController/regCrewController');
const { uploadRegCrewProfile } = require('../../config/upload');

router.get('/reg-create', regCrewController.getRegCreate);
router.post('/reg-create',
    uploadRegCrewProfile.single('uploadFile'),
    regCrewController.postRegCreate
);
router.get('/my-crews', regCrewController.getMyCrews);
router.post('/delete/:regularCrewId', regCrewController.postMyCrewDelete);
router.get('/crew-detail', regCrewController.getDetail);

module.exports = router;