const messageService = require('../services/chatService');
const ChatRoom = require('../models/ChatRoom');

function chatSocket(chat, io) {
    chat.on('connection', (socket) => {
        const roomId = socket.handshake.auth.roomId;
        const userId = socket.handshake.auth.userId;
        const userName = socket.handshake.auth.userName;

        if (!roomId || roomId === "" || !userId) {
            return socket.disconnect();
        }

        socket.join(roomId);

        socket.to(roomId).emit("join", {
            user: "system",
            chat: `${userName}님이 접속하였습니다.`
        });

        socket.on('chat message', async (msg) => {
            try {
                if (!msg || !msg.trim()) return;

                const saveChat = await messageService.sendChat(roomId, userId, msg.trim());

                // 같은 방 전체에게 메시지 전송
                chat.in(roomId).emit('chat message', {
                    _id: saveChat._id,
                    userId: userId,
                    userName: userName,
                    chat: saveChat.content,
                    createdAt: saveChat.createdAt,
                    roomId: roomId
                });

                // isMuted false인 멤버들에게 알림 emit
                const room = await ChatRoom.findById(roomId).populate('members.user', 'name');
                if (room) {
                    room.members.forEach(member => {
                        if (String(member.user._id) === String(userId)) return; // 본인 제외
                        if (member.isMuted) return; // 뮤트된 멤버 제외

                        const notiNamespace = io.of('/noti');
                        notiNamespace.to(`user:${member.user._id.toString()}`).emit('chat noti', {
                            roomId: roomId,
                            roomName: room.name,
                            senderName: userName,
                            content: saveChat.content
                        });
                    });
                }

            } catch (error) {
                console.error('메시지 처리 오류:', error);
            }
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('exit', {
                user: 'system',
                chat: `${userName}님이 퇴장하셨습니다`,
            });
        });
    });
}

module.exports = { chatSocket };