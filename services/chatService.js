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
    console.log('찾은 메시지:', chatMessage); // 👈
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
async function createChatRoom(crewId, crewName, hostId) {
    const room = await ChatRoom.create({
        name: crewName,
        members: [{ user: hostId, isMuted: false }],
        type: 'group',
        crewId: crewId, // 아래 스키마 수정 필요
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

module.exports = { getChatRoomList, getChatRoom, getMessage, sendChat, createChatRoom, addMemberToChatRoom };

