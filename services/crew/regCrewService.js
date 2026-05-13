const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');
const User = require('../../models/User');
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

    const user1 = await User.findById(userId).populate('crews').lean();
    const crew = user.crews;
    return crew;
}

async function getMyCrews(userId) {
    const crews = await regularCrew.find({
        $or : [
            {host : userId}, {'member.memberList.user' : userId}
        ]
    }).populate('host', 'name').sort({createdAt : -1});

    const day_Kor = {
        mon : '월', tue : '화', wed : '수', thu : '목', fri : '금', sat : '토', sun : '일', none : '-'
    }; // 한글 변환

    const period_Kor = {week : '매주', '2week' : '격주', month: '매달'}; // 한글 변환

    return crews.map(crew => {
        const obj = crew.toObject(); // JS 객체로 변환함

        const role = (obj.host._id.toString() === userId.toString()) ? 'host' : 'member'; // 크루장인지 크루원인지 구분

        const dayLabel = obj.day
            .filter(day => day !== 'none') // none이 아닌 것만 남김
            .map(day => day_Kor[day] || day) // day_Kor의 mon, tue 같은 것들을 한글로 변환함
            .join('·') || '-'; // 배열 이어붙이기 ex)화·목, 월·금, 요일 없으면 -
        
        return {
            ...obj,
            role,
            dayLabel, // obj(크루 데이터) 펼치고, role과 dayLabel을 추가
            periodLabel : period_Kor[obj.period] || obj.period, // period 한글 변환
            pct: Math.round(obj.member.memberList.length / obj.member.capacity * 100) + '%' // 인원 수를 퍼센트로 계산해서 게이지로 표현
        };
    });
}

async function deleteMyCrew(regularCrewId) {
    await regularCrew.findByIdAndDelete(regularCrewId);
}

module.exports = { createRegCrew, findCrewsByUserId, getMyCrews, deleteMyCrew };
