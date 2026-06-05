const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 특정 채팅방 메시지 불러오기
router.get('/chatList/api', chatController.openChatRoom);
// 채팅방 페이지
router.get('/chatPage', chatController.getChatRoomList);
router.patch('/:roomId/mute', chatController.toggleMute);
    

module.exports = router;