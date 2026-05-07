const userService = require('../services/userService');
const notiService = require('../services/notiService');

let _io = null;

const initSocket = (io) => {
    _io = io;
    console.log('웹소켓 서버 초기화 완료');

    const chat = io.of("/chat");
    const notification = io.of('/notification');

    chat.on("connection", (socket) => {
        console.log("chat 스페이스 접속");

        const roomId = socket.handshake.query.roomId;
        const userId = socket.handshake.query.userId;

        if (!roomId || !userId) {
            return socket.disconnect();
        }

        socket.join(roomId);

        socket.to(roomId).emit("join", {
            user : "system",
            chat : `${userId}님이 접속하였습니다.`
        });

        socket.on("chat message", (msg) => {
            chat.to(roomId).emit("chat message", {
                user : userId,
                chat : msg
            });
        });

        socket.on("disconnect", ()=> {
            consosle.log("chat 네임스페이스 접속 해제");

            socket.to(roomId).emit("exit", {
                user : "system",
                chat : `${userId}님이 퇴장하셨습니다`,
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
            socket.join(`notification:${user._id}`);

            const noti = await notiService.findUnReadNotiByUserId(user._id);
            socket.emit('UNREAD_NOTIFICATION', noti);
        } catch (error) {
            socket.disconnect();
        }
    });
};

module.exports = { initSocket };