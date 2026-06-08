const chatService = require('../services/chatService');
const ChatRoom = require('../models/ChatRoom');

// 왼쪽 채팅방 리스트 가져오기
const getChatRoomList = async (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/user/login');
    try {
        const userId = req.user._id;
        const crewType = req.query.crewType || 'regular';
        const roomId = req.query.roomId || null;
        const chatRoomList = await chatService.getChatRoomList(userId, crewType);

        let room = null;
        let messages = [];
        let isMuted = false;

        if (roomId) {
            room = await chatService.getChatRoom(roomId);
            messages = await chatService.getMessage(roomId);
            const member = room.members.find(m => String(m.user) === String(userId));
            isMuted = member ? member.isMuted : false;
            room = { ...room.toObject(), isMuted };
        }

        res.render('chat/chatRoom', { 
            chatRoomList, 
            currentUserId: userId, 
            user: req.user, 
            room,
            messages,
            crewType
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

        // isMuted 조회
        const member = room.members.find(m => String(m.user) === String(userId));
        const isMuted = member ? member.isMuted : false;

        res.json({ 
            success: true, 
            chatRoomList, 
            currentUserId: userId, 
            user: req.user, 
            room: { ...room.toObject(), sport, isMuted },
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