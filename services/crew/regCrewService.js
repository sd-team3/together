const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');

async function createCrew(crew) {
    const { title, intro, capacity, period, day, ageRange, address, sport, fee, profileImage } = crew || {};
    const addrSplit = address.split(' ');
    const profile = uploadFile ? uploadFile.filename : 'default-crew-profile.png';

    const newRegCrew = new regularCrew({
        title, intro, host,
        member: {
            capacity, 
            memberList: [host] 
        }, 
        period, day, ageRange,
        address: {
            state: addrSplit[0],
            city: addrSplit[1]
        },
        sport, fee, profileImage
    });

    try {
        await newRegCrew.save();
        return newRegCrew;
    } catch (error) {
        
    }
}