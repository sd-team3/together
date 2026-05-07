const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 채팅방 페이지
router.get('/', chatController.getChatRoomList);

// 특정 채팅방 메시지 불러오기
router.get('/:roomId', chatController.openChatRoom);

module.exports = router;