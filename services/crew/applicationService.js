const User = require('../../models/User');
const crewApplication = require('../../models/crewApplication');
const notification = require('../../models/notification');

async function createApplication(userId, crewId, crewType, options = {}) {
    const newApplication = new crewApplication({ userId, crewId, crewType });
    return await newApplication.save({ session: options.session });
}

async function acceptApplication(appId, currUserId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const app = await crewApplication.findById(appId).session(session);
        if (!app) {
            throw new Error('신청 정보를 찾을 수 없습니다.');
        }

        const crew = await regularCrew.findById(app.crewId).session(session);
        if (!crew || crew.host.toString() !== currUserId.toString()) {
            throw new Error('권한이 없거나 크루를 찾을 수 없습니다.');
        }

        app.status = 'accepted';
        await app.save({ session });

        crew.member.memberList.push({ user: app.userId, joinedAt: new Date() });
        await crew.save({ session });

        const user = await User.findById(app.userId).session(session);
        if (user) {
            user.crews.push(app.crewId);
            await user.save({ session });
        }

        await notification.create([{
            receiver: app.userId,
            title: '크루 가입 수락',
            content: `"${crew.title}" 크루에 가입되었습니다!`,
            type: 'application_accepted'
        }], { session });

        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: '신청이 수락되었습니다.' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
}

const findPendingApplicationsByCrewId = async (crewId) => {
    try {
        const applications = await crewApplication.find({ 
            crew: crewId, 
            status: 'pending' 
        })
        .populate('userId', 'name profileImage')
        .sort({ createdAt: -1 });

        return applications;
    } catch (error) {
        throw new Error('findPendingApplicationsByCrewId');
    }
};

module.exports = {
    createApplication,
    findPendingApplicationsByCrewId,
    acceptApplication //기능명세
}