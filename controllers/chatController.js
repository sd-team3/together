const chatService = require('../services/chatService');

// 왼쪽 채팅방 리스트 가져오기
const getChatRoomList = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }
    try {
        const userId = req.user._id;
        const chatRooms = await chatService.getChatRoomList(userId);

        res.render('chat/chatRoom', { chatRooms, currentUserId : userId });
    } catch (error) {
        next(error);
    }
};

const openChatRoom = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/15_login');
    }
    try {
        const userId = req.user._id;
        const roomId = req.params.roomId;
        const chatRooms = await chatService.getChatRoomList(userId);
        const room = await chatService.getChatRoom(roomId, userId);
        const messages = await chatService.getMessage(roomId);

        res.render('chat/chatRoom', { chatRooms, currentUserId: userId, room, messages });
    } catch (error) {
        next(error);
    }
};

module.exports = {getChatRoomList, openChatRoom};