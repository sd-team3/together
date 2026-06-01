const express = require('express');
const router = express.Router();
const applicationController = require('../../controllers/crewController/applicationController');

router.post('/create-application', applicationController.postApplication);
router.post('/pending-application', applicationController.getPendingApplication);

module.exports = router;