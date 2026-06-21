const cron = require('node-cron');
const { deleteExpiredInstantChatRooms } = require('../services/crew/instantService');
const crewActivity = require('../models/crewActivity');
const crewService = require('../services/crew/crewService');
const notiService = require('../services/notiService');
const User = require('../models/User');
const mongoose = require('mongoose');

// 매일 자정 만료된 번개모임·채팅방 자동 삭제
function startScheduler(io) {
    cron.schedule('0 0 * * *', async () => {
        console.log('[Scheduler] 만료된 번개모임 채팅방 정리 시작');
        try {
            const { deleted } = await deleteExpiredInstantChatRooms();
            console.log(`[Scheduler] 채팅방 ${deleted}개 삭제 완료`);
        } catch (err) {
            console.error('[Scheduler] 채팅방 정리 오류:', err);
        }
    });

    
    cron.schedule('* * * * *', async () => {
        console.log('되긴해');
        try {
            const now = new Date();

            const startedActivities = await crewActivity.find({
                startTime: { $lte: now },
                status: { $in: ['모집', '마감'] }
            });

            for (let act of startedActivities) {
                try {
                    // 🚨 1. 상태부터 먼저 확실하게 변경하고 DB에 저장!
                    act.status = '활동';
                    await act.save();
                    console.log(`▶️ [모임 시작] ${act.title} (상태: 활동으로 변경 완료)`);

                    // 🚨 2. 솔로전/팀전 상관없이 모든 참가자 ID 긁어오기
                    // 솔로전은 teamBlue에만, 팀전은 양쪽에 데이터가 있으니 그냥 둘 다 합치면 끝납니다.
                    const allParticipants = [
                        ...(act.teamBlue || []),
                        ...(act.teamRed || [])
                    ];

                    // 참가자가 1명도 없으면 알림 로직은 스킵
                    if (allParticipants.length === 0) continue;

                    // 크루 이름은 반복문 밖에서 한 번만 조회 (최적화)
                    const crewName = await crewService.getCrewName(act.crewModel, act.crewId);

                    // 🚨 3. forEach 대신 반드시 Promise.all + map 조합 사용! (비동기 처리)
                    await Promise.all(allParticipants.map(async (pId) => {
                        try {
                            const notiData = {
                                sender: crewName,
                                receiver: pId,
                                title: `${act.title}에 출석하세요!`,
                                content: `모임 장소 : ${act.location.state} ${act.location.city} ${act.location.detail}`,
                                event: `ACTIVITY_ATTEND`,
                                route: `/${act.crewModel}/act/attend/${act._id}`,
                                target: []
                            };
                        
                            // 💥 에러 원인 제거: { session } 지움 (트랜잭션 안 쓰시니까 빼야 안 터집니다)
                            const newNoti = await notiService.createNoti(notiData); 
                            
                            // app.js에서 넘어온 io 객체가 있으면 소켓 발송
                            if (typeof io !== 'undefined' && io) {
                                io.of('/noti').to(`user:${pId}`).emit(newNoti.event, newNoti);
                            }
                        } catch (notiErr) {
                            console.error(`[알림 개별 발송 실패 - 유저:${pId}]`, notiErr.message);
                        }
                    }));

                } catch (error) {
                    console.error(`[활동 상태 변경/알림 에러] ${act.title}:`, error.message);
                }
            }

            const endedActivities = await crewActivity.find({
                endTime: { $lte: now },
                status: '활동'
            });

            for (let act of endedActivities) {
                try {
                    const allParticipants = [
                        ...(act.teamBlue || []),
                        ...(act.teamRed || [])
                    ].map(id => id.toString());

                    const attendedUsers = (act.attender || []).map(id => id.toString());

                    const noShowUsers = allParticipants.filter(id => !attendedUsers.includes(id));
                    const attendedCount = attendedUsers.length;

                    if (attendedUsers.length > 0) {
                        await User.updateMany(
                            { _id: { $in: attendedUsers } },
                            { $inc: { honor: 1 } }
                        );
                    }

                    if (noShowUsers.length > 0) {
                        await User.updateMany(
                            { _id: { $in: noShowUsers } },
                            { $inc: { honor: -1 } }
                        );
                    }

                    if (attendedCount > 0) {
                        const CrewModel = mongoose.model(act.crewModel + 'Crew'); 
                        
                        await CrewModel.findByIdAndUpdate(
                            act.crewId,
                            { $inc: { rating: attendedCount } }
                        );
                    }

                    act.status = '종료';
                    await act.save();

                    console.log(`🏁 [정산완료] ${act.title}`);
                    console.log(`   - 출석: ${attendedCount}명 (+1점) / 노쇼: ${noShowUsers.length}명 (-1점)`);

                } catch (error) {
                    console.error(`[정산 에러] ${act.title} 처리 중 오류:`, error.message);
                }
            }

        } catch (error) {
            console.error(error.message);
        }
    });
}


module.exports = { startScheduler };