const instantCrew = require('../../models/instantCrew');

async function getInstantCrew() {
    return await instantCrew.find()
        .populate('host', 'name')
        .sort({ createdAt: -1 });
}


async function createInstantCrew(data, host) {
    const { title, intro, sport, capacity, 
        state, city, lat, lng, isAutoAccept, meetAt_date, meetAt_time } = data;
    
    const crew = new instantCrew({
        title,
        intro,
        meetAt: new Date(`${meetAt_date}T${meetAt_time}`),
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
// 내가 만든 번개모임 목록
async function getMyCrews(userId) {
    return await instantCrew.find({ host: userId })
        .sort({ createdAt: -1 })
        .lean();
}

// 특정 모임 상세 (멤버/신청자 populate)
async function getCrewDetail(crewId) {
    return await instantCrew.findById(crewId)
        .populate('host', 'name tel profileImage')
        .populate('member.memberList.user', 'name tel age gender profileImage')
        .populate('member.pendingList.user', 'name tel age gender profileImage')
        .lean();
}
module.exports = {
    createInstantCrew, 
    getInstantCrew, 
    getMyCrews,
    getCrewDetail
};