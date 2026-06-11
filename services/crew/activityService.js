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

module.exports = {
    createActivity
};