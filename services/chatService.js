const mongoose = require('mongoose');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

async function getChatRoomList(userId, crewType = null) {
    if (!userId) {
        const error = new Error('존재하지 않는 사용자입니다.');
        error.status = 400;
        throw error;
    }

    const query = { "members.user": userId };
    
    if (crewType === 'instant') {
        query.crewType = 'instant';
    } else if (crewType === 'regular') {
        // crewType이 'regular'이거나 null(기존 데이터)인 것 모두 포함
        query.$or = [
            { crewType: 'regular' },
            { crewType: null },
            { crewType: { $exists: false } }
        ];
    }

    const chatRoom = await ChatRoom.find(query)
        .populate('members.user', 'name')
        .populate('lastMessage', 'content')
        .sort({ lastMessageAt: -1 });

    return chatRoom;
}

async function getChatRoom (roomId, userId) {
    if (!roomId) {
        const error = new Error ('존재하지 않는 방입니다.');
        error.status = 400;
        throw error;
    }
    const room = await ChatRoom.findById(new mongoose.Types.ObjectId(roomId));
    return room;
}

async function getMessage (roomId) {
    if (!roomId) {
        const error = new Error ('존재하지 않는 방입니다.');
        error.status = 400;
        throw error;
    }

    const chatMessage = await Message.find({ room: new mongoose.Types.ObjectId(roomId) })
                                    .select('sender content isRead createdAt')
                                    .populate('sender', 'name')
                                    .sort({ createdAt : 1 });
    
    return chatMessage;
};

// 채팅을 치면 DB에 저장
async function sendChat (room, sender, content, isRead) {
    const chat = new Message({room, sender, content, isRead});
    await chat.save();

    // lastMessage
    await ChatRoom.findByIdAndUpdate(room, {
        lastMessage: chat._id,
        lastMessageAt: new Date(),
    });

    return chat;
}

// 크루 생성 시 채팅방 생성
async function createChatRoom(crewId, crewName, hostId, crewType = 'regular') {
    const room = await ChatRoom.create({
        name: crewName,
        members: [{ user: hostId, isMuted: false }],
        type: 'group',
        crewId: crewId,
        crewType: crewType
    });
    return room;
}

// 가입 승인 시 채팅방에 멤버 추가
async function addMemberToChatRoom(crewId, userId) {
    await ChatRoom.findOneAndUpdate(
        { crewId: crewId },
        { $push: { members: { user: userId, isMuted: false } } }
    );
}

// 회원 탈퇴 시 채팅방 처리
async function handleUserDeleted(userId) {
    const objectId = new mongoose.Types.ObjectId(userId);
    
    await ChatRoom.updateMany(
        { "members.user": objectId },
        { $pull: { members: { user: objectId }, noticeOffMembers: objectId } }
    );

    await ChatRoom.deleteMany({ members: { $size: 0 } }); // members가 0명이 된 채팅방 삭제

    await Message.updateMany(
        { sender: objectId },
        { $set: { sender: null } } //알수없음 표시
    );
}

module.exports = { getChatRoomList, getChatRoom, getMessage, sendChat, createChatRoom, addMemberToChatRoom, handleUserDeleted };


