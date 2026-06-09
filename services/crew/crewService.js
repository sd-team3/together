const User = require('../../models/User');
const regularCrew = require('../../models/regularCrew');
const instantCrew = require('../../models/instantCrew');

const findHostByCrewId = async (crewModel, crewId)=>{
    const crew = await crewModel.findById(crewId).select('host');
    return crew ? crew.host : null;
}

const modelMap = {
    regularCrew: regularCrew,
    instantCrew: instantCrew
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

module.exports = { findHostByCrewId, addCrewToUser, addUserToCrew };