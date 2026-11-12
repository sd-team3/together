const express = require('express');
const router = express.Router();
const regularCrew = require('../../models/regularCrew');
const regularController = require('../../controllers/crew/regularController');
const applicationController = require('../../controllers/crew/applicationController');
const crewMiddleware = require('../../middlewares/crewMiddleware');
const { uploadRegularProfile, uploadCrewIntro } = require('../../config/upload');
const activityRouter = require('../crew/activityRouter');

router.use((req, res, next)=>{
    req.crewModel = regularCrew;
    next();
});

router.use('/act', activityRouter);
router.post('/intro-images', crewMiddleware.loginValidation, (req, res) => {
    uploadCrewIntro.single('image')(req, res, error => {
        if (error) return res.status(400).json({ success: false, message: error.message });
        if (!req.file) return res.status(400).json({ success: false, message: '사진을 선택해주세요.' });
        res.json({ success: true, src: `/images/reg-crew/intro/${req.file.filename}` });
    });
});
router.use('/:crewId/attendance', require('./attendanceRouter'));

router.get('/create',
    crewMiddleware.loginValidation,
    regularController.getRegularCreate
);

router.post('/create',
    uploadRegularProfile.single('uploadFile'),
    crewMiddleware.loginValidation,
    crewMiddleware.regularCreateMiddleware,
    regularController.postRegularCreate
);

router.post('/delete/:crewId',
    crewMiddleware.loginValidation,
    crewMiddleware.isCrewExist,
    crewMiddleware.isHost,
    regularController.postMyCrewDelete
);

router.post('/withdraw/:crewId',
    crewMiddleware.loginValidation,
    crewMiddleware.isCrewExist,
    crewMiddleware.isMember,
    regularController.postMyCrewWithdraw
);


router.post('/application/:crewId',
    crewMiddleware.loginValidation,
    crewMiddleware.isCrewExist,
    crewMiddleware.applicationValidation,
    applicationController.postApplication
);

router.get('/pending/:crewId',
    crewMiddleware.loginValidation,
    crewMiddleware.isCrewExist,
    crewMiddleware.isHost,
    applicationController.getPendingApps
);

router.get('/relation/:crewId/:userId', 
    crewMiddleware.loginValidation,
    applicationController.getRelation
);

router.post('/join/:appId/:action',
    crewMiddleware.loginValidation,
    crewMiddleware.joinMiddleware,
    crewMiddleware.isCrewExist,
    crewMiddleware.isHost,
    applicationController.joinProcess
);

router.get('/my',
    (req, res) => res.redirect('/regular/list')
);
router.get('/list', regularController.getRegular);
router.get('/list/:crewId', 
    regularController.getRegularPage
);

router.get('/api', regularController.getRegularAPI);

router.get('/manage/:crewId',
    (req, res) => res.redirect(`/regular/list/${req.params.crewId}`)
);
router.post('/manage/:crewId/update',
    crewMiddleware.loginValidation,
    crewMiddleware.isCrewExist,
    crewMiddleware.isHost,
    uploadRegularProfile.single('uploadFile'),
    regularController.postCrewUpdate
);

router.post('/list/:crewID/like',
    crewMiddleware.loginValidation,
    regularController.postCrewLike
);

router.post('/review/:crewId',
    crewMiddleware.loginValidation,
    crewMiddleware.isCrewExist,
    crewMiddleware.isMember,
    regularController.postCrewReview
);

router.get('/review/:crewId/summary',
    crewMiddleware.isCrewExist,
    regularController.getCrewReviewSummary
);

module.exports = router;
