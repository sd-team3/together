const instantCrew = require('../../models/instantCrew');

async function getInstantCrew(filter = {}, page = 1) {
    const query = {};
    const limit = 9;
    const skip = (page - 1) * limit;

    if (filter.sport) {
        query.sport = { $in: filter.sport };
    }
    if (filter.state) {
        query['address.state'] = filter.state;
    }
    if (filter.city) {
        query['address.city'] = filter.city;
    }
    if (filter.isAutoAccept) {
        query.isAutoAccept = filter.isAutoAccept === 'true';
    }
    if (filter.isRecruiting) {
        query.$expr = {
            $lt: [{ $size: '$member.memberList' }, '$member.capacity']
        };
    }
    // 번개모임 특성상 지난 모임 제외
    if (filter.upcoming) {
        query.meetAt = { $gte: new Date() };
    }

    const total = await instantCrew.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const crews = await instantCrew.find(query)
        .sort({ meetAt: 1 })  // 번개는 모임 시간 빠른 순이 자연스러워요
        .skip(skip)
        .limit(limit)
        .populate('host', 'name');

    return { crews, totalPages, currentPage: page };
}


async function createInstantCrew(data, host) {
    const { title, intro, sport, capacity, 
        state, city, detail,lat, lng, isAutoAccept, meetAt_date, meetAt_time } = data;
    
    const crew = new instantCrew({
        title,
        intro,
        meetAt: new Date(`${meetAt_date}T${meetAt_time}`),
        host,
        member: {
            capacity: Number(capacity),
            memberList: [{user: host, role: 'host', status: 'confirmed'}]
        },
        isAutoAccept,
        address: {
            state,
            city,
            detail: detail || '',
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
    return await instantCrew.find({
        $or: [
            { host: userId },
            { 'member.memberList.user': userId }
        ]
    })
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

async function deleteInstantCrew(crewId, userId){
    const crew = await instantCrew.findById(crewId);

    if(!crew) return { success: false, status: 404, message: '모임을 찾을 수 없습니다'};
    if (crew.host.toString() !== userId.toString()) return { success: false, status: 403, message: '권한이 없습니다.' };

    await instantCrew.findByIdAndDelete(crewId);

    return { success: true };
}

async function kickMember(crewId, hostId, userId) {
    const crew = await instantCrew.findById(crewId);
    if(!crew) return { success: false, message: '모임을 찾을 수 없습니다'};
    if(crew.host.toString() !== hostId.toString()) return { success: false, status: 403, message: '권한이 없습니다'};
    
    const memberIndex = crew.member.memberList.findIndex(
        m => m.user.toString() === userId.toString()
    );
    if (memberIndex === -1) return { success: false, status: 404, message: '해당 멤버를 찾을 수 없습니다' };
    if (crew.member.memberList[memberIndex].role === 'host') return { success: false, status: 400, message: '모임장은 강퇴할 수 없습니다' };
    crew.member.memberList.splice(memberIndex, 1);
    await crew.save();

    return { success: true };
}   

const findHostByCrewId = async (crewId)=>{
    const crew = await instantCrew.findById(crewId).select('host');
    return crew ? crew.host : null;
}
module.exports = {
    createInstantCrew, 
    getInstantCrew, 
    getMyCrews,
    getCrewDetail,
    deleteInstantCrew,
    kickMember
};