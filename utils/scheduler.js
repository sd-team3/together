const cron = require('node-cron');
const { deleteExpiredInstantChatRooms } = require('../services/crew/instantService');
const crewActivity = require('../models/crewActivity');
const regularCrew = require('../models/regularCrew');
const instantCrew = require('../models/instantCrew');
const notiService = require('../services/notiService');
const { dateKey } = require('../services/crew/attendanceService');
const User = require('../models/User');
const mongoose = require('mongoose');

async function sendReminder(io, meeting, participants, model, startTime, location, route, now) {
    const userIds = [...new Set(participants.filter(Boolean).map(id => id.toString()))];
    const minutesLeft = Math.ceil((new Date(startTime).getTime() - now.getTime()) / 60000);

    await Promise.all(userIds.map(async (userId) => {
        try {
            const notiData = {
                sender: null,
                receiver: userId,
                title: `${minutesLeft}분 후 '${meeting.title}'이 시작돼요`,
                content: `모임 장소 : ${location.state} ${location.city} ${location.detail}. 도착 후 QR로 출석해주세요.`,
                event: 'ACTIVITY_REMINDER',
                route,
                reminderKey: `${model}:${meeting._id}:${new Date(startTime).toISOString()}:${userId}`,
                target: []
            };

            const newNoti = await notiService.createReminderNoti(notiData);
            if (newNoti && io) {
                io.of('/noti').to(`user:${userId}`).emit(newNoti.event, newNoti);
            }
        } catch (error) {
            console.error(`[시작 전 알림 실패 - 유저:${userId}]`, error.message);
        }
    }));
}

async function sendActivityReminders(io, now = new Date()) {
    // 1분 주기의 실행 지연이나 서버 재시작 시에도 시작 전까지 재시도한다.
    const upcoming = new Date(now.getTime() + 15 * 60 * 1000);
    const activities = await crewActivity.find({
        crewModel: 'regular',
        startTime: { $gt: now, $lte: upcoming },
        status: { $in: ['모집', '마감'] }
    });

    for (const act of activities) {
        try {
            const crew = await regularCrew.findById(act.crewId).select('host').lean();
            if (!crew) continue;

            const participants = [crew.host, ...(act.teamBlue || []), ...(act.teamRed || [])];
            const route = `/regular/${act.crewId}/attendance/day/${dateKey(act.startTime)}?activity=${act._id}`;
            await sendReminder(io, act, participants, 'regular', act.startTime, act.location, route, now);
        } catch (error) {
            console.error(`[정기 활동 시작 전 알림 실패] ${act.title}:`, error.message);
        }
    }

    const crews = await instantCrew.find({ meetAt: { $gt: now, $lte: upcoming } });
    for (const crew of crews) {
        try {
            const participants = [
                crew.host,
                ...crew.member.memberList
                    .filter(member => member.status === 'confirmed')
                    .map(member => member.user)
            ];
            const route = `/instant/${crew._id}/attendance`;
            await sendReminder(io, crew, participants, 'instant', crew.meetAt, crew.address, route, now);
        } catch (error) {
            console.error(`[번개 모임 시작 전 알림 실패] ${crew.title}:`, error.message);
        }
    }
}

// 매일 자정 만료된 번개모임·채팅방 자동 삭제
function startScheduler(io) {
    cron.schedule('* * * * *', async () => {
        try {
            await sendActivityReminders(io);
        } catch (error) {
            console.error('[Scheduler] 시작 전 알림 오류:', error.message);
        }
    });

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
        try {
            const now = new Date();

            const startedActivities = await crewActivity.find({
                startTime: { $lte: now },
                status: { $in: ['모집', '마감'] }
            });

            for (let act of startedActivities) {
                try {
                    act.status = '활동';
                    await act.save();
                    console.log(`▶️ [모임 시작] ${act.title} (상태: 활동으로 변경 완료)`);
                    const allParticipants = [
                        ...(act.teamBlue || []),
                        ...(act.teamRed || [])
                    ];

                    if (allParticipants.length === 0) continue;

                    await Promise.all(allParticipants.map(async (pId) => {
                        try {
                            const notiData = {
                                sender: null,
                                receiver: pId,
                                title: `${act.title}에 출석하세요!`,
                                content: `모임 장소 : ${act.location.state} ${act.location.city} ${act.location.detail}`,
                                event: `ACTIVITY_ATTEND`,
                                route: act.crewModel === 'regular'
                                    ? `/regular/${act.crewId}/attendance/day/${dateKey(act.startTime)}?activity=${act._id}`
                                    : `/instant/${act.crewId}/attendance`,
                                target: []
                            };
                        
                            const newNoti = await notiService.createNoti(notiData); 
                            
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


module.exports = { startScheduler, sendActivityReminders };
