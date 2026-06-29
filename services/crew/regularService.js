const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');
const crewService = require('../../services/crew/crewService');
const path = require('path');
const fs = require('fs');
const User = require('../../models/User');
const { CONSTANTS } = require('../../config/constants');
const chatService = require('../chatService'); //
const crewApplication = require('../../models/crewApplication');
const ChatRoom = require('../../models/ChatRoom');
const activityService = require('../crew/activityService');
const crewActivity = require('../../models/crewActivity');

async function createRegCrew(data, profileFile, host) {
    const { removeImage, sport, title, intro, 
        period, day, state, city, detail, fee, 
        level, capacity, ageRange, isAutoAccept } = data;    

    if (removeImage && removeImage !== "false" && removeImage !== "default-profile-image.jpg") {
        const deleteFilePath = path.join(__dirname, '../../public/images/reg-crew/profile/', removeImage);
            
        if (fs.existsSync(deleteFilePath)) {
            fs.unlinkSync(deleteFilePath);
            console.log(`[파일 삭제 성공]: ${removeImage}`);
        }
    }

    let profileImage = '/images/reg-crew/profile/default-profile-image.jpg';
    if (profileFile) {
        profileImage = `/images/reg-crew/profile/${profileFile.filename}`;
    }

    const regCrew = new regularCrew({
        title, intro, host,
        member: {
            capacity: Number(capacity),
            memberList: [{ user: host }]
        },
        isAutoAccept, period, day, ageRange,
        address: { state, city, detail: detail || null },
        sport, fee: Number(fee) || 0, 
        level: level || 'none', profileImage
    });

    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const crew = await regCrew.save({ session: session });
        // await crewService.addCrewToUser(host, crew._id, { session });
        await chatService.createChatRoom(crew._id, crew.title, host);

        await session.commitTransaction();
        session.endSession();
        
        return { success: true, data: regCrew };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        throw error;
    }
}

async function getRegularCrews(page = 1) {
    const query = {};
    const limit = 9;
    const totalRegular = await regularCrew.countDocuments(query);
    const totalPages = Math.ceil(totalRegular/limit);

    const regularCrews = await regularCrew.find({})
                        .sort({createdAt : -1})
                        .skip((page - 1) * limit)
                        .limit(limit);
    return {regularCrews, currentPage: page, totalPages};
}

async function getRegularAPICrews(filter, page) {
    const query = {};
    const limit = 9;
    const skip = (page-1) * limit;
 
    if (filter.day) {
        query.day = { $in : filter.day };
    }
    if (filter.isAutoAccept) {
        query.isAutoAccept = filter.isAutoAccept  === 'true';
    }
    if (filter.sport) {
        query.sport = { $in : filter.sport };
    }
    if (filter.ageRange) {
        query.ageRange = { $in : filter.ageRange };
    }
    if (filter.state) {
        query['address.state'] = filter.state;
    }
    if (filter.city) {
        query['address.city'] = filter.city;
    }
    if (filter.isRecruiting) {
        query.$expr = { 
            $lt: [ { $size: "$member.memberList" }, "$member.capacity" ] 
        };
    }
    const totalRegular = await regularCrew.countDocuments(query);
    const totalPages = Math.ceil(totalRegular/limit);
    const regularCrews = await regularCrew.find(query)
                                          .sort ({createdAt : -1 })
                                          .skip(skip)
                                          .limit(limit);
    return {
        regularCrews, totalPages, currentPage: page
    }                              
}

async function getMyCrews(userId, role) {
    let tab;

    if(role === 'host') {
        tab = { host : userId };
    } else if(role === 'member') {
        tab = { 'member.memberList.user' : userId, host : { $ne : userId } };
    } else {
        tab = {
            $or: [
                {host : userId}, {'member.memberList.user' : userId}
            ]
        };
    }

    const crews = await regularCrew.find(tab).populate('host', 'name').sort({createdAt : -1});

    return crews.map(crew => {
        const obj = crew.toObject();

        const crewRole = (obj.host._id.toString() === userId.toString()) ? 'host' : 'member';

        const dayLabel = obj.day
            .filter(day => day !== 'none')
            .map(day => CONSTANTS.DAYS[day]?.short || day)
            .join('·') || '-';
        
        return {
            ...obj,
            crewRole,
            dayLabel,
            periodLabel : CONSTANTS.PERIODS[obj.period]?.kr || obj.period,
            pct: Math.round(obj.member.memberList.length / obj.member.capacity * 100) + '%'
        };
    });
}

async function deleteMyCrew(regularCrewId) {
    await regularCrew.findByIdAndDelete(regularCrewId);
}

async function withdrawMyCrew(regularCrewId, userId) {
    await regularCrew.findByIdAndUpdate(regularCrewId, {$pull: {'member.memberList': {user: userId}}});
}

async function getCrewDetail(regularCrewId) {
    const crew = await regularCrew.findById(regularCrewId).populate('host', 'name profileImage');

    const obj = crew.toObject();

    const dayLabel = obj.day
            .filter(day => day !== 'none')
            .map(day => CONSTANTS.DAYS[day]?.short || day)
            .join(' · ') || '-';
        
    const ageLabel = obj.ageRange
            .map(a => {
                const found = Object.values(CONSTANTS.AGES).find(age => age.v === a);
                return found ? found.kr : a;
            })
            .join(' · ');

    const sportLabel = CONSTANTS.SPORTS[obj.sport]?.kr || obj.sport;
    const periodLabel = CONSTANTS.PERIODS[obj.period]?.kr || obj.period;
    const levelLabel  = CONSTANTS.LEVELS[obj.level]?.kr  || obj.level;
    const acceptLabel = CONSTANTS.ACCEPT[obj.isAutoAccept]?.kr || '';
    return {
        ...obj,
        dayLabel,
        ageLabel,
        sportLabel,
        periodLabel,
        levelLabel,
        acceptLabel
    };
}

async function crewLike(regularCrewId, userId) {
    const crew = await regularCrew.findById(regularCrewId);
    const isLiked = crew.likedBy.some(id => id.toString() === userId.toString());
    await regularCrew.findByIdAndUpdate(regularCrewId,
        isLiked ? { $pull: {likedBy: userId}, $inc: {reputation: -1} } : { $push: {likedBy: userId}, $inc: {reputation: 1}}
    );
}

async function getCrewManage(regularCrewId) {
    const crew = await regularCrew.findById(regularCrewId).populate('member.memberList.user', 'name age profileImage address');

    const pendingApps = await crewApplication.find({ crewId: regularCrewId, status: 'pending' })
                                             .populate('userId', 'name age profileImage');
    console.log('pendingApps:', pendingApps);

    const acts = await activityService.findActsByCrewId(regularCrewId);
    return { crew, pendingApps, acts };
}

async function postCrewUpdate(regularCrewId, updateData, updateFile) {
    const crew = await regularCrew.findById(regularCrewId);
    if(updateData.removeImage === 'true' || updateFile) {
        if(crew.profileImage && crew.profileImage != '/images/reg-crew/profile/default-profile-image.jpg') {
            const oldPath = path.join(process.cwd(), 'public/images/reg-crew/profile', crew.profileImage);
            if(fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        if (updateFile) updateData.profileImage = `/images/reg-crew/profile/${updateFile.filename}`;
        else updateData.profileImage = '/images/reg-crew/profile/default-profile-image.jpg';
    }
    delete updateData.removeImage;
    return await regularCrew.findByIdAndUpdate(regularCrewId, { $set: updateData }, { new: true });;
}

async function getCrewActivity(regularCrewId) {
    const crew = await regularCrew.findById(regularCrewId).lean();
    const acts = await activityService.findActsByCrewId(regularCrewId);
    crew.acts = acts;
    return crew;
}

async function handleUserDeleted(userId) {
    // 탈퇴 유저가 host인 정기모임의 채팅방 삭제
    const hostCrews = await regularCrew.find({ host: userId }).select('_id');
    const crewIds = hostCrews.map(c => c._id);
    await ChatRoom.deleteMany({ crewId: { $in: crewIds } });

    // 정기모임 삭제
    await regularCrew.deleteMany({ host: userId });

    // CrewActivity에 가입한 유저 삭제
    await crewActivity.updateMany(
        { $or: [{ teamBlue : userId }, { teamRed : userId }]},
        { $pull: { teamBlue : userId, teamRed : userId }}
    )

    // 나머지 모임에서 memberList에서 제거
    await regularCrew.updateMany(
        { "member.memberList.user": userId },
        { $pull: { "member.memberList": { user: userId } } }
    );
}

module.exports = { 
    createRegCrew,
    getMyCrews, 
    deleteMyCrew, 
    getCrewDetail, 
    withdrawMyCrew, 
    crewLike,
    getRegularCrews, 
    getRegularAPICrews,
    getCrewManage,
    postCrewUpdate,
    getCrewActivity,
    handleUserDeleted
};