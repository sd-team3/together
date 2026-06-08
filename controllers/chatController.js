const chatService = require('../services/chatService');
const ChatRoom = require('../models/ChatRoom');

// 왼쪽 채팅방 리스트 가져오기
const getChatRoomList = async (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/user/login');
    try {
        const userId = req.user._id;
        const crewType = req.query.crewType || 'regular';
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
    if (!req.isAuthenticated()) return res.redirect('user/login');
    try {
        const userId = req.user._id;
        const roomId = req.query.roomId;
        const chatRoomList = await chatService.getChatRoomList(userId);
        const room = await chatService.getChatRoom(roomId);
        const messages = await chatService.getMessage(roomId);

        // sport 조회
        let sport = null;
        if (room && room.crewId) {
            const InstantCrew = require('../models/instantCrew');
            const RegularCrew = require('../models/regularCrew');
            const crew = room.crewType === 'instant'
                ? await InstantCrew.findById(room.crewId).select('sport')
                : await RegularCrew.findById(room.crewId).select('sport');
            sport = crew?.sport || null;
        }

        res.json({ 
            success: true, 
            chatRoomList, 
            currentUserId: userId, 
            user: req.user, 
            room: { ...room.toObject(), sport },  // sport 포함
            messages
        });
    } catch (error) {
        next(error);
    }
};
const toggleMute = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id;

        const room = await ChatRoom.findOne({ _id: roomId, 'members.user': userId });
        if (!room) return res.status(404).json({ success: false, message: '채팅방 없음' });

        const member = room.members.find(m => String(m.user) === String(userId));
        const newMuted = !member.isMuted;

        await ChatRoom.updateOne(
            { _id: roomId, 'members.user': userId },
            { $set: { 'members.$.isMuted': newMuted } }
        );

        res.json({ success: true, isMuted: newMuted });
    } catch (error) {
        next(error);
    }
};

module.exports = {getChatRoomList, openChatRoom, toggleMute};