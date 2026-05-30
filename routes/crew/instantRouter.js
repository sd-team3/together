const express = require('express');
const router = express.Router();
const instantController = require('../../controllers/crew/instantController');
const applicationController = require('../../controllers/crew/applicationController');
const applicationService = require('../../services/crew/applicationService');
const crewMiddleware = require('../../middlewares/crewMiddleware');
const { uploadRegularProfile } = require('../../config/upload');


router.get('/instant', instantController.getInstant);
router.get('/create', instantController.getInstantCreate);
router.post('/create', instantController.postInstantCreate);

module.exports = router;