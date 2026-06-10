const express = require('express');
const router = express.Router();
const comController = require('../../controllers/community/comController');

router.get('/list', comController.getCommunity);

router.get('/list/api/:category', comController.getListAPI);

router.post('list/:boardId/like', comController.postBoardLike);

module.exports = router;