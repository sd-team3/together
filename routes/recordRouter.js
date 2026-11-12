const express = require('express');
const router = express.Router();
const crewMiddleware = require('../middlewares/crewMiddleware');
const requestValidation = require('../middlewares/requestValidation');
const recordController = require('../controllers/recordController');

router.get('/activities', crewMiddleware.loginValidation, recordController.getMyActivities);

router.post(
    '/',
    requestValidation.recordLoginValidation,
    requestValidation.recordSaveValidation,
    recordController.createRecord
);

router.get('/', crewMiddleware.loginValidation, recordController.getRecordWrite);

module.exports = router;
