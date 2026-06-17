const crewActivity = require('../../models/crewActivity');


async function createActivity(activityData) {
    try {
        const newActivity = new crewActivity(activityData);

        const result = await newActivity.save();
        return result;
    } catch (error) {
        throw error;
    }
};

async function findActById(actId) {
    try {
        const act = await crewActivity.findById(actId);
        return act;
    } catch (error) {
        console.error("findActById:", error.message);
        throw error;
    }
};

async function findActsByCrewId(crewId) {
    try {
        const acts = await crewActivity.find({ crewId }).sort({ startTime: -1 }).populate({ path: 'teamBlue teamRed', select: 'name age profileImage' });
        return acts;
    } catch (error) {
        console.error("findActivitiesByCrewId:", error.message);
        throw error;
    }
}

module.exports = {
    createActivity,
    findActById,
    findActsByCrewId
};