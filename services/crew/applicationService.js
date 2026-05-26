const User = require('../../models/User');
const crewAppliment = require('../../models/crewApplication');
const notification = require('../../models/notification')

async function createApplication(userId, crewId, crewType, options = {}) {
    const newAppliment = new crewAppliment({ userId, crewId, crewType });
    return await newAppliment.save({ session: options.session });
}

module.exports = {
    createApplication //기능명세
}