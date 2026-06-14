const express = require('express');
const router = express.Router();
const activityMiddleware = require('../../middlewares/activityMiddleware');
const activityController = require('../../controllers/crew/activityController');
const crewMiddleware = require('../../middlewares/crewMiddleware');

router.post('/create/:crewId', 
    crewMiddleware.isCrewExist,
    crewMiddleware.isHost,
    activityMiddleware.activityCreateMiddleware,
    activityController.postActivityCreate
);

router.post('/progress/:actId/:status',
    activityMiddleware.isActExist,
    activityMiddleware.progressMiddleware,
    crewMiddleware.isHost,
    activityController.postProgress
);

router.post('/entry/:actId',
    activityMiddleware.isActExist,
    crewMiddleware.isMember
);













module.exports = router;