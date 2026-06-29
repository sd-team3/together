const express = require('express');
const router = express.Router({ mergeParams: true });
const activityMiddleware = require('../../middlewares/activityMiddleware');
const activityController = require('../../controllers/crew/activityController');
const crewMiddleware = require('../../middlewares/crewMiddleware');

router.post('/create/:crewId', 
    crewMiddleware.isCrewExist,
    crewMiddleware.isHost,
    activityMiddleware.activityCreateMiddleware,
    activityController.postActivityCreate
);

router.post('/entry/:actId',
    activityMiddleware.isActExist,
    crewMiddleware.isMember,
    activityController.postEntry
);

// router.post('/attend/:actId', 
//     activityMiddleware.isActExist,
//     activityController.postAttendance
// );













module.exports = router;