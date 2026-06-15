let headerSocket = null;

function initNotiSocket(user) {
    if (!user || !user._id) {
        return;
    }

    socket = io('/noti', { auth: { userId: user._id } });

    socket.on('UNREAD_NOTIFICATION', (notis) => {
    
    });
}
