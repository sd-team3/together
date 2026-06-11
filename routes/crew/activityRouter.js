const express = require('express');
const router = express.Router();
const activityMiddleware = require('../../middlewares/activityMiddleware');


router.post('/create', 
    activityMiddleware.activityCreateMiddleware
);













module.exports = router;