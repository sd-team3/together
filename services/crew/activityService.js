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

module.exports = {
    createActivity,
    findActById
};