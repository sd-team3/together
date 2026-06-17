const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { loginValidation } = require('../middlewares/crewMiddleware');

// 특정 채팅방 메시지 불러오기
router.get('/chatList/api', loginValidation, chatController.openChatRoom);
// 채팅방 페이지
router.get('/chatPage', loginValidation, chatController.getChatRoomList);
router.patch('/:roomId/mute', chatController.toggleMute);
    

module.exports = router;