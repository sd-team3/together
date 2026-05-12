const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');
const User = require('../../models/User');

async function createCrew(crew) {
    const { title, intro, capacity, period, day, ageRange, address, sport, fee, profileImage } = crew || {};
    const addrSplit = address.split(' ');
    const profile = uploadFile ? uploadFile.filename : 'default-crew-profile.png';

    const newRegCrew = new regularCrew({
        title, intro, host,
        member: { capacity, memberList: [host] },
        isAutoAccept, period, day, ageRange,
        address: { state: addrSplit[0], city: addrSplit[1] },
        sport, fee, profileImage
    });

    try {
        await newRegCrew.save();
        return newRegCrew;
    } catch (error) {
        
    }
}



async function findCrewsByUserId(userId) {
    const user = await User.findById(userId).populate({
        path: 'crews',
        populate: { path: 'host', select: 'name' }
    }).lean();

    const user1 = await User.findById(userId).populate('crews').lean();
    const crew = user.crews;
    return crew;
}

module.exports = { findCrewsByUserId };