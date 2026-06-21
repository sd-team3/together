const User = require('../../models/User');
const regularCrew = require('../../models/regularCrew');
const instantCrew = require('../../models/instantCrew');

const findHostByCrewId = async (crewModel, crewId)=>{
    const crew = await crewModel.findById(crewId).select('host');
    return crew ? crew.host : null;
};

const userInCrew = async (crewModel, crewId, userId)=>{
    const result = await crewModel.exists({
        _id: crewId,
        $or: [
            { host: userId },
            { "member.memberList.user": userId }
        ]
    });

    return !!result;
};

async function addUserToCrew(userId, crewId, crewModel, options = {}) {
    const session = options.session || null;
    const result = await crewModel.findOneAndUpdate(
        { 
            _id: crewId, 
            'member.memberList.user': { $ne: userId },
            $expr: { $lt: [{ $size: '$member.memberList'}, '$member.capacity']}
        },
        { 
            $push: { 
                'member.memberList': { 
                    user: userId, 
                    joinedAt: new Date() 
                } 
            } 
        },
        { session, returnDocument: 'after' }
    );
    return result;
}

async function addCrewToUser(userId, crewId, options = {}) {
    const session = options.session || null;
    const result = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { crews: crewId } },
        { session, returnDocument: 'after' }
    );

    return result;
}

async function getCrewName(modelName, crewId) {
    try {
        if(modelName === 'instant') {
            const crew = await instantCrew.findById(crewId).select('title').lean();
            return crew ? crew.name : '알 수 없는 크루';
        } else if(modelName === 'regular') {
            const crew = await regularCrew.findById(crewId).select('title').lean();
            return crew ? crew.name : '알 수 없는 크루';
        }
    } catch (error) {
        console.error('크루 이름 조회 에러:', error.message);
        return '알 수 없는 크루';
    }
}

module.exports = { findHostByCrewId, addCrewToUser, addUserToCrew, userInCrew, getCrewName };