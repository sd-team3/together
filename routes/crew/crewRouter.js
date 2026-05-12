const express = require('express');
const router = express.Router();
const regCrewController = require('../../controllers/crewController/regCrewController');
const { uploadRegCrewProfile } = require('../../config/upload');

router.get('/reg-create', regCrewController.getRegCreate);
router.post('/reg-create',
    uploadRegCrewProfile.single('uploadFile'),
    regCrewController.postRegCreate
);
router.get('/my', regCrewController.getMyCrews);

module.exports = router;