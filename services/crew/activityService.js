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
        const acts = await crewActivity.find({ crewId }).sort({ startTime: -1 }).populate({ path: 'teamBlue teamRed attender', select: 'name age profileImage' });
        return acts;
    } catch (error) {
        console.error("findActivitiesByCrewId:", error.message);
        throw error;
    }
}

async function findActsByUserId(userId, crewType) {
    try {
        const acts = await crewActivity
        .find({ crewModel: crewType, attender: {$in: [userId]}})
        .populate({ path: 'crewId', model: crewType+'Crew', populate: { path: 'host', select: 'name'}})
        .sort({ startTime: -1})
        .lean();
        return acts;
    } catch (error) {
        console.error("findActsByUserId: ", error.message);
    }
}

async function findGameRecordsByUserId(userId, crewType) {
    const crewModelName = crewType === 'regular' ? 'regularCrew' : 'instantCrew';
    const acts = await crewActivity
        .find({
            crewModel: crewType,
            $or: [{ teamBlue: userId }, { teamRed: userId }]
        })
        .populate({ path: 'crewId', model: crewModelName, select: 'title' })
        .sort({ startTime: -1 })
        .lean();

    return acts.map(act => {
        const attended = (act.attender || []).some(id => id.toString() === userId.toString());
        const attendanceRecord = (act.attendanceRecords || []).find(record => record.user.toString() === userId.toString());
        const attendanceStatus = attendanceRecord?.status || (attended ? 'present' : act.attendanceSettledAt ? 'absent' : 'pending');
        const hasReviewed = (act.mannerReviews || []).some(review => review.reviewer.toString() === userId.toString());
        return { ...act, attended, attendanceStatus, hasReviewed };
    });
}
 
module.exports = {
    createActivity,
    findActById,
    findActsByCrewId,
    findActsByUserId,
    findGameRecordsByUserId
};
