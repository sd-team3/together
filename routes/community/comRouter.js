const express = require('express');
const router = express.Router();
const comController = require('../../controllers/community/comController');
const crewMiddleware = require('../../middlewares/crewMiddleware');

router.get('/list', comController.getCommunity);

router.get('/list/api/:category', comController.getListAPI);

router.post('/list/:boardId/like', comController.postBoardLike);

router.get('/list/:boardId', comController.getDetail);

router.post('/list/:boardId/comment', 
    crewMiddleware.loginValidation,
    comController.postComment);

router.put('/list/:boardId/comment/:commentId', 
    crewMiddleware.loginValidation,
    comController.putComment);

router.delete('/list/:boardId/comment/:commentId', 
    crewMiddleware.loginValidation,
    comController.deleteComment); 

router.get('/list/:boardId/edit', 
    crewMiddleware.loginValidation,
    comController.getEditBoard);

router.post('/list/:boardId/edit', 
    crewMiddleware.loginValidation,
    comController.postEditBoard); 

router.post('/list/:boardId/delete', 
    crewMiddleware.loginValidation,
    comController.deleteBoard);

router.post('/list/:boardId/delete', comController.deleteBoard);

module.exports = router;