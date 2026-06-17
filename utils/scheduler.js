const cron = require('node-cron');
const { deleteExpiredInstantChatRooms } = require('../services/crew/instantService');

// 매일 자정 만료된 번개모임·채팅방 자동 삭제
function startScheduler() {
    cron.schedule('0 0 * * *', async () => {
        console.log('[Scheduler] 만료된 번개모임 채팅방 정리 시작');
        try {
            const { deleted } = await deleteExpiredInstantChatRooms();
            console.log(`[Scheduler] 채팅방 ${deleted}개 삭제 완료`);
        } catch (err) {
            console.error('[Scheduler] 채팅방 정리 오류:', err);
        }
    });
}

module.exports = { startScheduler };