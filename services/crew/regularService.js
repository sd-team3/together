const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');
const crewService = require('../../services/crew/crewService');
const path = require('path');
const fs = require('fs');

async function createRegCrew(data, profileFile, host) {
    const { removeImage, sport, title, intro, 
        period, day, state, city, detail, fee, 
        level, capacity, ageRange, isAutoAccept } = data;    

    if (removeImage && removeImage !== "false" && removeImage !== "default-profile-image.jpg") {
        const deleteFilePath = path.join(__dirname, '../../public/images/reg-crew/profile/', removeImage);
            
        if (fs.existsSync(deleteFilePath)) {
            fs.unlinkSync(deleteFilePath);
            console.log(`[파일 삭제 성공]: ${removeImage}`);
        }
    }

    let profileImage = '/images/reg-crew/profile/default-profile-image.jpg';
    if (profileFile) {
        profileImage = `/images/reg-crew/profile/${profileFile.filename}`;
    }

    const regCrew = new regularCrew({
        title, intro, host,
        member: {
            capacity: Number(capacity),
            memberList: [{ user: host }]
        },
        isAutoAccept, period, day, schedule: [], ageRange,
        address: { state, city, detail: detail || null },
        sport, fee: Number(fee) || 0, 
        level: level || 'none', profileImage
    });

    const session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const crew = await regCrew.save({ session: session });
        await crewService.addCrewToUser(host, crew._id, { session });

        await session.commitTransaction();
        session.endSession();
        
        return { success: true, data: regCrew };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        throw error;
    }
}

const findHostByCrewId = async (crewId)=>{
    const crew = await regularCrew.findById(crewId).select('host');
    return crew ? crew.host : null;
}

module.exports = { createRegCrew, findHostByCrewId };