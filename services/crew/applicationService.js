const User = require('../../models/User');
const crewApplication = require('../../models/crewApplication');
const notification = require('../../models/notification');
const regularCrew = require('../../models/regularCrew');
const instantCrew = require('../../models/instantCrew');


async function findAppById(appId) { 
    return await crewApplication.findById(appId); 
}

async function createApp(userId, crewId, crewType, options = {}) {
    const newApplication = new crewApplication({ userId, crewId, crewType });
    return await newApplication.save({ session: options.session });
}

async function appStatusUpdateById(appId, action, options = {}) {
    const session = options.session || null;

    const result = await crewApplication.findByIdAndUpdate(
        appId,
        { status: action },
        { session, new: true }
    );

    return result;
}

const findPendingAppsByCrewId = async (crewId) => {
    try {
        const apps = await crewApplication.find({ 
            crew: crewId, 
            status: 'pending' 
        })
        .populate('userId', 'name age profileImage gender honor')
        .sort({ createdAt: -1 });

        return apps;
    } catch (error) {
        console.error("DB 에러:", error);
        throw new Error('findPendingAppsByCrewId');
    }
};


module.exports = {
    createApp,
    findPendingAppsByCrewId,
    findAppById,
    appStatusUpdateById
}