const instantCrew = require('../../models/instantCrew');

async function getInstantCrew() {
    return await instantCrew.find()
        .populate('host', 'name')
        .sort({ createdAt: -1 });
}


async function createInstantCrew(data, host) {
    const { title, intro, sport, capacity, 
        state, city, lat, lng, isAutoAccept } = data;
    
    const crew = new instantCrew({
        title,
        intro,
        host,
        member: {
            capacity: Number(capacity),
            memberList: [{user: host}]
        },
        isAutoAccept,
        address: {
            state,
            city,
            lat: Number(lat),
            lng: Number(lng)
        },
        sport
    });
    try {
        await crew.save();
        return {success : true, data: crew};
    } catch (error) {
        console.error(error);
        throw error;
    }

}

async function applyInstantCrew(crewId, userId) {
    const crew = await instantCrew.findById(crewId);

    if(!crew) return { success : false, message: '매칭을 찾을 수 없습니다.' };
    
    const isFull = crew.member.memberList.length >= crew.member.capacity;
    if(isFull) return { success: false, message: '정원이 마감되었습니다.' };

    const alreadyMember = crew.member.memberList.some(m => m.user.equals(userId));
    if(alreadyMember) return { success: false, message: '이미 참가 중입니다.' };

    const alreadyPending = crew.member.pendingList.some(m => m.user.equals(userId));
    if(alreadyPending) return { success: false, message: '이미 신청 중입니다.' };

    const isHost = crew.host.equals(userId);
    if(isHost) return { success: false, message: '본인이 만든 매칭입니다.' };

    if(crew.isAutoAccept) {
        crew.member.memberList.push({ user: userId });
    }else {
        crew.member.pendingList.push({ user: userId });
    }

    await crew.save();
    return {
        success: true,
        message: crew.isAutoAccept ? '참가 완료!' : '신청 완료! 호스트 수락을 기다려주세요!'
    };
}

module.exports = {createInstantCrew, getInstantCrew, applyInstantCrew};