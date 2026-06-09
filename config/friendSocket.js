const friendService = require('../services/friendService');
const notiService = require('../services/notiService');
const userService = require('../services/userService');

function friendSocket(noti) {
    noti.on('connection', (socket) => {

        socket.on('friend:request', async ({ receiverId }) => {
            const sender = socket.data.user;
            console.log('서버 수신 receiverId:', receiverId);
            console.log('sender:', sender?._id); 
            if (!sender) return;

            try {
                const receiver = await userService.findUserById_WithoutPW(receiverId);
                if (!receiver) return socket.emit('friend:error', { message: '유저를 찾을 수 없습니다.' });

                const request = await friendService.sendFriendRequest(sender._id, receiverId);

                noti.to(`user:${receiverId}`).emit('friend:requested', {
                    requestId: request._id,
                    sender: {
                        _id: sender._id,
                        name: sender.name,
                        gender: sender.gender,
                        age: sender.age,
                        profileImage: sender.profileImage
                    }
                });

                await notiService.createNoti({
                    sender: sender._id,
                    receiver: receiverId,
                    title: '친구 요청',
                    content: `${sender.name}님이 친구 요청을 보냈습니다.`,
                    event: 'friend:requested',
                    route: '/friends'
                });

                socket.emit('friend:request:sent', { message: '친구 요청을 보냈습니다.' });

            } catch (err) {
                socket.emit('friend:error', { message: err.message });
            }
        });

        socket.on('friend:accept', async ({ requestId, senderId }) => {
            const receiver = socket.data.user;
            if (!receiver) return;

            try {
                await friendService.acceptFriendRequest(requestId, receiver._id);

                noti.to(`user:${senderId}`).emit('friend:accepted', {
                    receiver: {
                        _id: receiver._id,
                        name: receiver.name,
                        profileImage: receiver.profileImage
                    }
                });

                await notiService.createNoti({
                    sender: receiver._id,
                    receiver: senderId,
                    title: '친구 요청 수락',
                    content: `${receiver.name}님이 친구 요청을 수락했습니다.`,
                    event: 'friend:accepted',
                    route: '/friends'
                });

                socket.emit('friend:accept:done');

            } catch (err) {
                socket.emit('friend:error', { message: err.message });
            }
        });

        socket.on('friend:reject', async ({ requestId }) => {
            const receiver = socket.data.user;
            if (!receiver) return;

            try {
                await friendService.rejectFriendRequest(requestId, receiver._id);
                socket.emit('friend:reject:done');
            } catch (err) {
                socket.emit('friend:error', { message: err.message });
            }
        });
    });
}

module.exports = { friendSocket };