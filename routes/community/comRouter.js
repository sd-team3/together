const express = require('express');
const router = express.Router();
const comController = require('../../controllers/community/comController');
const crewMiddleware = require('../../middlewares/crewMiddleware');
const {uploadBoard} = require('../../config/upload');

router.get('/list', comController.getCommunity);

router.get('/list/api/:category', comController.getListAPI);

router.post('list/:boardId/like', comController.postBoardLike);

router.get('/write', comController.getWrite);

router.post('/write', crewMiddleware.loginValidation, uploadBoard.single('file'), comController.postWrite);

module.exports = router;