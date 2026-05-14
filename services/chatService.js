const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

async function getChatRoomList (userId) {
    if (!userId) {
        const error = new Error ('존재하지 않는 사용자입니다.');
        error.status = 400;
        throw error;
    }

    const chatRoom = await ChatRoom.find({ members : userId })
                                    .populate('members', 'name')
                                    .populate('lastMessage', 'content')
                                    .sort({ lastMessageAt : -1 });
    
    return chatRoom;
};

async function getChatRoom (roomId, userId) {
    if (!roomId) {
        const error = new Error ('존재하지 않는 방입니다.');
        error.status = 400;
        throw error;
    }
    const room = await ChatRoom.findOne({ _id : roomId, members : userId } )
                                        .populate('members', 'name');
    return room;
}

async function getMessage (roomId) {
    if (!roomId) {
        const error = new Error ('존재하지 않는 방입니다.');
        error.status = 400;
        throw error;
    }

    const chatMessage = await Message.find({ room : roomId })
                                    .select('sender content isRead createdAt')
                                    .populate('sender', 'name')
                                    .sort({ createdAt : 1 });
    return chatMessage;
};

// 채팅을 치면 DB에 저장
async function sendChat (room, sender, content, isRead) {
    const chat = new Message({room, sender, content, isRead});
    await chat.save();

    return chat;
}

module.exports = {getChatRoomList, getChatRoom, getMessage, sendChat}