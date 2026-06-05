const chatService = require('../services/chatService');

// 왼쪽 채팅방 리스트 가져오기
const getChatRoomList = async (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/user/login');
    try {
        const userId = req.user._id;
        const crewType = req.query.crewType || null;
        const chatRoomList = await chatService.getChatRoomList(userId, crewType);

        res.render('chat/chatRoom', { 
            chatRoomList, 
            currentUserId: userId, 
            user: req.user, 
            room: null, 
            messages: [],
            crewType  // EJS에서 탭 활성화용
        });
    } catch (error) {
        next(error);
    }
};

const openChatRoom = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('user/login');
    }
    try {
        const userId = req.user._id;
        const roomId = req.query.roomId;
        const chatRoomList = await chatService.getChatRoomList(userId);
        const room = await chatService.getChatRoom(roomId);
        const messages = await chatService.getMessage(roomId);

        res.json( {
            success : true, 
            chatRoomList, 
            currentUserId: userId, 
            user: req.user, 
            room, 
            messages
         });
    } catch (error) {
        next(error);
    }
};

module.exports = {getChatRoomList, openChatRoom};