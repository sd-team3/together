const User = require('../../models/User');
const crewAppliment = require('../../models/crewApplication');
const notification = require('../../models/notification')

async function createAppliment(userId, crewId, crewType) {
    const newAppliment = new crewAppliment({ userId, crewId, crewType });


}

module.exports = {
    createAppliment //기능명세
}