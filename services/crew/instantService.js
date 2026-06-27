// services/crew/instantService.js
const instantCrew = require('../../models/instantCrew');
const chatService = require('../chatService');
const ChatRoom = require('../../models/ChatRoom');
const { CONSTANTS } = require('../../config/constants');

async function getInstantCrew(filter = {}) {
    const query = { meetAt: { $gte: new Date() } };

    if (filter.sport) query.sport = { $in: filter.sport };
    if (filter.state) query['address.state'] = filter.state;
    if (filter.city) query['address.city'] = filter.city;
    if (filter.isAutoAccept) query.isAutoAccept = filter.isAutoAccept === 'true';
    if (filter.isRecruiting) {
        query.$expr = { $lt: [{ $size: '$member.memberList' }, '$member.capacity'] };
    }

    const crews = await instantCrew.find(query)
        .sort({ createdAt: -1 })
        .populate('host', 'name')
        .populate('member.memberList.user', 'name age gender');

    return { crews };
}


async function getInstantPageData(filter, currentUser) {
    const { crews } = await getInstantCrew(filter);

    const crewsJson = crews.map(c => ({
        id:           c._id,
        title:        c.title,
        intro:        c.intro || '',
        sport:        c.sport,
        sportKr:      CONSTANTS.SPORTS[c.sport]?.kr || c.sport,
        state:        c.address.state,
        city:         c.address.city,
        lat:          c.address.lat,
        lng:          c.address.lng,
        current:      c.member.memberList.length,
        capacity:     c.member.capacity,
        host:         c.host.name || '익명',
        isAutoAccept: c.isAutoAccept,
        meetAt:       c.meetAt,
        createdAt:    c.createdAt,
        avgReputation: c.avgReputation || 0,
        members: c.member.memberList.map(m => ({
            nickname: m.user?.name || '멤버',
            gender:   m.user?.gender || '',
            age:      m.user?.age || '',
            role:     m.role === 'host' ? '모임장' : '참가확정',
            joinedAt: m.createdAt || ''
        }))
    }));

    let myCrewIds = [];
    if (currentUser) {
        const userId = currentUser._id.toString();
        myCrewIds = crews
            .filter(c =>
                c.host._id.toString() === userId ||
                c.member.memberList.some(m => m.user?._id?.toString() === userId)
            )
            .map(c => c._id.toString());
    }

    return {
        crews,        // EJS render용 raw 데이터
        crewsJson,
        myCrewIds,
        currentUserId: currentUser ? currentUser._id.toString() : null
    };
}

async function createInstantCrew(data, host) {
    const { title, intro, sport, capacity,
        state, city, detail, lat, lng, isAutoAccept, meetAt_date, meetAt_time } = data;

    const crew = new instantCrew({
        title,
        intro,
        meetAt: new Date(`${meetAt_date}T${meetAt_time}`),
        host,
        member: {
            capacity: Number(capacity),
            memberList: [{ user: host, role: 'host', status: 'confirmed' }]
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
        await chatService.createChatRoom(crew._id, crew.title, host, 'instant');
        return { success: true, data: crew };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function findInstantCrewsByUserId(userId) {
    const crew = await instantCrew.find({ "member.memberList.user": userId })
        .populate('host', 'name')
        .lean();
    return sortCrewByDate(crew);
}

function sortCrewByDate(crew) {
    const now = Date.now();
    return crew.sort((a, b) => {
        if ((a.meetAt < now) === (b.meetAt < now)) return a.meetAt - b.meetAt;
        return a.meetAt < now ? 1 : -1;
    });
}

async function getCrewDetail(crewId) {
    return await instantCrew.findById(crewId)
        .populate('host', 'name tel profileImage')
        .populate('member.memberList.user', 'name tel age gender profileImage')
        .lean();
}

async function deleteInstantCrew(crewId, userId) {
    const crew = await instantCrew.findById(crewId);

    if (!crew) return { success: false, status: 404, message: '모임을 찾을 수 없습니다' };
    if (crew.host.toString() !== userId.toString()) return { success: false, status: 403, message: '권한이 없습니다.' };

    await instantCrew.findByIdAndDelete(crewId);

    return { success: true };
}

async function kickMember(crewId, hostId, userId) {
    const crew = await instantCrew.findById(crewId);
    if (!crew) return { success: false, message: '모임을 찾을 수 없습니다' };
    if (crew.host.toString() !== hostId.toString()) return { success: false, status: 403, message: '권한이 없습니다' };

    const memberIndex = crew.member.memberList.findIndex(
        m => m.user && m.user.toString() === userId.toString()
    );
    if (memberIndex === -1) return { success: false, status: 404, message: '해당 멤버를 찾을 수 없습니다' };
    if (crew.member.memberList[memberIndex].role === 'host') return { success: false, status: 400, message: '모임장은 강퇴할 수 없습니다' };
    crew.member.memberList.splice(memberIndex, 1);
    await crew.save();

    return { success: true };
}

const findHostByCrewId = async (crewId) => {
    const crew = await instantCrew.findById(crewId).select('host');
    return crew ? crew.host : null;
};

async function setNoshow(crewId, hostId, userId) {
    const crew = await instantCrew.findById(crewId);
    if (!crew) return { success: false, status: 404, message: '모임을 찾을 수 없습니다' };
    if (crew.host.toString() !== hostId.toString()) return { success: false, status: 403, message: '권한이 없습니다' };

    const member = crew.member.memberList.find(m => m.user && m.user.toString() === userId.toString());
    if (!member) return { success: false, status: 404, message: '해당 멤버를 찾을 수 없습니다' };
    if (member.role === 'host') return { success: false, status: 400, message: '모임장은 노쇼 처리할 수 없습니다' };

    member.status = 'noshow';
    await crew.save();
    return { success: true };
}

async function handleUserDeleted(userId) {
    const hostCrews = await instantCrew.find({ host: userId }).select('_id');
    const crewIds = hostCrews.map(c => c._id);
    await ChatRoom.deleteMany({ crewId: { $in: crewIds } });

    await instantCrew.deleteMany({ host: userId });

    await instantCrew.updateMany(
        { "member.memberList.user": userId },
        { $pull: { "member.memberList": { user: userId } } }
    );
}
// 만료된 번개모임 채팅방 삭제
async function deleteExpiredInstantChatRooms() {
    const expiredCrews = await instantCrew.find({ meetAt: { $lt: new Date() } }).select('_id');
    const crewIds = expiredCrews.map(c => c._id);

    if (crewIds.length === 0) return { deleted: 0 };

    const result = await ChatRoom.deleteMany({ crewId: { $in: crewIds }, crewType: 'instant' });
    return { deleted: result.deletedCount };
}
module.exports = {
    createInstantCrew,
    getInstantCrew,
    getCrewDetail,
    deleteInstantCrew,
    getInstantPageData,
    kickMember,
    findInstantCrewsByUserId,
    setNoshow,
    handleUserDeleted,
    findHostByCrewId,
    deleteExpiredInstantChatRooms
};
