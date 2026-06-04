const User = require('../../models/User');
const regularCrew = require('../../models/regularCrew');
const instantCrew = require('../../models/instantCrew');

const addCrewToUser = async (userId, crewId, options = {}) => {
    await User.findByIdAndUpdate( userId, 
        { $addToSet: { crews: crewId } }, { session: options.session });
};

const addUserToCrew = async (crewId, userId, options = {}) => {
    return await regularCrew.findByIdAndUpdate(
        crewId,
        {
            // $push를 사용하여 member 객체 안의 memberList 배열에 새 객체 추가
            $push: {
                "member.memberList": {
                    user: userId,
                    joinedAt: new Date() // 가입 일시
                }
            }
        },
        { session: options.session }
    );
};

module.exports = { addUserToCrew };