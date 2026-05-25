const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');
const User = require('../../models/User');
const path = require('path');
const constants = require('../../config/constants');
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

    try {
        await regCrew.save();
        return { success: true, data: regCrew };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function findCrewsByUserId(userId) {
    const user = await User.findById(userId).populate({
        path: 'crews',
        populate: { path: 'host', select: 'name' }
    }).lean();

    if(!user) return null;
    
    const crew = sortCrewByDay(user.crews);
    return crew.map(c => {
        return { ...c, day : c.day.map(d => constants.CONSTANTS.DAYS[d]?.short || '미정') };
    });
}


function sortCrewByDay(crews) {
    const today = new Date().getDay();
    const dayMap = {'sun' : 0, 'mon' : 1, 'tue' : 2, 'wed' : 3, 'thu' : 4, 'fri' : 5, 'sat' : 6, 'none' : 7};

    sortDay = (day, today) => {
        day = dayMap[day];
        if(day === 7 || day === undefined) return 7; 
        return day - today >= 0 ? day - today : (day + 7) - today;
    }

    crews = crews.map(c => {
        c.day.sort((a, b) => sortDay(a, today) - sortDay(b, today));
        return { ...c, day : c.day};
    });
    return crews.sort((a, b) => sortDay(a.day[0], today) - sortDay(b.day[0], today));
}

module.exports = { createRegCrew, findCrewsByUserId };
