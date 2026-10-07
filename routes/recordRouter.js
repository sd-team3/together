const express = require('express'); 
const router = express.Router();
const crewMiddleware = require('../middlewares/crewMiddleware');
const recordController = require('../controllers/recordController');

router.get('/',
    crewMiddleware.loginValidation,
    recordController.getRecordWrite
)

module.exports = router;