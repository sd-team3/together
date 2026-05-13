const messageService = require('../services/chatService');
const userService = require('../services/userService');
const notiService = require('../services/notiService');

let _io = null;

const initSocket = (io) => {
    _io = io;
    console.log('웹소켓 서버 초기화 완료');

    const chat = io.of('/chat');
    const notification = io.of('/notification');
    
    chat.on('connection', (socket) => {
        console.log('chat 스페이스 접속');

        const roomId = socket.handshake.auth.roomId;
        const userId = socket.handshake.auth.userId;
        const userName = socket.handshake.auth.userName;

        if (!roomId || !userId) {
            return socket.disconnect();
        }

        socket.join(roomId);

        socket.to(roomId).emit("join", {
            user : "system",
            chat : `${userName}님이 접속하였습니다.`
        });

        socket.on('chat message', async (msg) => {
            try {
                if (!msg || !msg.trim()) return;

                const saveChat = await messageService.sendChat(roomId, userId, msg.trim());

                chat.to(roomId).emit('chat message', {
                    _id: saveChat._id,
                    userId: userId,
                    chat: saveChat.content,
                    createdAt: saveChat.createdAt
                });

            } catch (error) {
                console.error('메시지가 저장되지않았습니다.', error);
            }
            
        });

        socket.on('disconnect', ()=> {
            console.log('chat 네임스페이스 접속 해제');

            socket.to(roomId).emit('exit', {
                user : 'system',
                chat : `${userName}님이 퇴장하셨습니다`,
            });
        });
    });

    notification.on('connection', async (socket)=>{
        const { userId } = socket.handshake.auth;

        if(!userId) {
            return socket.disconnect();
        }

        try {
            const user = await userService.findUserById_WithoutPW(userId);
            if (!user) return socket.disconnect();
            socket.data.user = user;
            socket.join(`user:${user._id}`);

            const noti = await notiService.findUnReadNotiByUserId(user._id);
            socket.emit('UNREAD_NOTIFICATION', noti);
        } catch (error) {
            socket.disconnect();
        }
    });
};


module.exports = { initSocket };