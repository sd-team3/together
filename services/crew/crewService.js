const User = require('../../models/User');

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

module.exports = { findHostByCrewId, addCrewToUser, addUserToCrew, userInCrew };