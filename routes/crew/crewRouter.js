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
router.post('/withdraw/:regularCrewId', regCrewController.postMyCrewWithdraw);
router.get('/:regularCrewId', regCrewController.getCrewDetail);
router.post('/:regularCrewId/like', regCrewController.postCrewLike);

module.exports = router;