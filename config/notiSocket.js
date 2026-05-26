function notiSocket(noti) {
    noti.on('connection', async (socket)=>{
        const { userId } = socket.handshake.auth;
        if(!userId) { return socket.disconnect() }
    
        try {
            const user = await userService.findUserById_WithoutPW(userId);
            if (!user) return socket.disconnect();
            socket.data.user = user;
            socket.join(`user:${user._id}`);
        } catch (error) {
            socket.disconnect();
        }
    });
}

module.exports = { notiSocket };