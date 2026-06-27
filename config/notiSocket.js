const userService = require('../services/userService');

// function notiSocket(noti) {
//     noti.on('connection', async (socket)=>{
//         const { userId } = socket.handshake.auth;
//         if(!userId) { return socket.disconnect() }
    
//         try {
//             const user = await userService.findUserById_WithoutPW(userId);
//             if (!user) return socket.disconnect();
//             socket.data.user = user;
//             socket.join(`user:${user._id.toString()}`);

            
//         } catch (error) {
//             socket.disconnect();
//         }
//     });
// }

// 알림 소켓 핸들러 파일 (notiSocket 또는 initSocket 내부)
function notiSocket(noti) {
    noti.on('connection', async (socket)=>{
        const { userId } = socket.handshake.auth;
        
        // 1. 소켓이 요청을 보내는 순간 바로 터미널에 찍히는 로그 (무조건 찍혀야 함)
        console.log(`[Socket] /noti 네임스페이스에 클라이언트 접근 시도! (유저 ID: ${userId})`);
        
        if(!userId) { 
            console.log('[Socket] userId가 전달되지 않아 소켓을 차단합니다.');
            return socket.disconnect(); 
        }
    
        try {
            const user = await userService.findUserById_WithoutPW(userId);
            
            if (!user) {
                console.log(`[Socket] DB에서 유저(${userId})를 찾을 수 없어 연결을 종료합니다.`);
                return socket.disconnect();
            }
            
            socket.data.user = user;
            
            const roomName = `user:${user._id.toString()}`; //개인 방 입장
            socket.join(roomName);
            
            console.log(`[Socket] 크루장(${user._id})이 ${roomName} 방에 안전하게 입장했습니다.`);
            
        } catch (error) {
            // 그동안 숨겨져 있던 에러를 터미널에 출력
            console.error('[Socket] findUserById 조회 중 치명적인 에러 발생:', error);
            socket.disconnect();
        }
    });
}


module.exports = { notiSocket };