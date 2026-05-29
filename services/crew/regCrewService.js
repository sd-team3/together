const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');
const User = require('../../models/User');
const path = require('path');
const constants = require('../../config/constants');
const fs = require('fs');
const { CONSTANTS } = require('../../config/constants');

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

async function getRegularCrews(page = 1) {
    const query = {};
    const limit = 9;
    const totalRegular = await regularCrew.countDocuments(query);
    const totalPages = Math.ceil(totalRegular/limit);

    const regularCrews = await regularCrew.find({})
                        .sort({createdAt : -1})
                        .limit(limit);
    return {regularCrews, currentPage: page, totalPages};
}

async function getRegularAPICrews(filter, page) {
    const query = {};
    const limit = 9;
    const skip = (page-1) * limit;
    // $in : 몽고 DB에게 여러개의 값을 가져오라는 것 
    if (filter.day) {
        query.day = { $in : filter.day };
    }
    if (filter.isAutoAccept) {
        query.isAutoAccept = filter.isAutoAccept  === 'true';
    }
    if (filter.sport) {
        query.sport = { $in : filter.sport };
    }
    if (filter.ageRange) {
        query.ageRange = { $in : filter.ageRange };
    }
    if (filter.state) {
        query['address.state'] = filter.state;
    }
    if (filter.city) {
        query['address.city'] = filter.city;
    }
    if (filter.isRecruiting) {
        // 가져오는 속도를 높이기 위해 memberList.length < capacity를 몽고 DB 언어로 직역한 것이다.
        query.$expr = { 
            $lt: [ { $size: "$member.memberList" }, "$member.capacity" ] 
        };
    }
    const totalRegular = await regularCrew.countDocuments(query);
    const totalPages = Math.ceil(totalRegular/limit);
    const regularCrews = await regularCrew.find(query)
                                          .sort ({createdAt : -1 })
                                          .skip(skip)
                                          .limit(limit);
    return {
        regularCrews, totalPages, currentPage: page
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

async function getMyCrews(userId, role) {
    let tab;

    if(role === 'host') {
        tab = { host : userId };
    } else if(role === 'member') {
        tab = { 'member.memberList.user' : userId, host : { $ne : userId } }; // $ne : 몽고DB 연산자. not equal의 줄임말
    } else {
        tab = {
            $or: [ // $or : 똑같이 몽고DB 연산자
                {host : userId}, {'member.memberList.user' : userId}
            ]
        };
    } //

    const crews = await regularCrew.find(tab).populate('host', 'name').sort({createdAt : -1});

    return crews.map(crew => {
        const obj = crew.toObject(); // JS 객체로 변환함

        const period_Kor = { week: '매주', '2week': '격주', month: '매달' }; // 한글 변환

        const crewRole = (obj.host._id.toString() === userId.toString()) ? 'host' : 'member'; // 크루장인지 크루원인지 구분

        const dayLabel = obj.day
            .filter(day => day !== 'none') // none이 아닌 것만 남김
            .map(day => CONSTANTS.DAYS[day]?.short || day) // day_Kor의 mon, tue 같은 것들을 한글로 변환함
            .join('·') || '-'; // 배열 이어붙이기 ex)화·목, 월·금, 요일 없으면 -
        
        return {
            ...obj,
            crewRole,
            dayLabel, // obj(크루 데이터) 펼치고, role과 dayLabel을 추가
            periodLabel : period_Kor[obj.period] || obj.period, // period 한글 변환
            pct: Math.round(obj.member.memberList.length / obj.member.capacity * 100) + '%' // 인원 수를 퍼센트로 계산해서 게이지로 표현
        };
    });
}

async function deleteMyCrew(regularCrewId) {
    await regularCrew.findByIdAndDelete(regularCrewId);
}

async function withdrawMyCrew(regularCrewId, userId) {
    await regularCrew.findByIdAndUpdate(regularCrewId, {$pull: {'member.memberList': {user: userId}}});
}

async function getCrewDetail(regularCrewId) {
    const crew = await regularCrew.findById(regularCrewId).populate('host', 'name profileImage');

    const obj = crew.toObject();

    const period_Kor = { week: '매주', '2week': '격주', month: '매달' };
    const level_Kor = {none : '무관', low : '초급', mid : '중급', high : '상급'};
    const accept_Kor = {true : '승인 가입', false : '자동 가입'};

    const dayLabel = obj.day
            .filter(day => day !== 'none')
            .map(day => CONSTANTS.DAYS[day]?.short || day)
            .join(' · ') || '-';
        
    const ageLabel = obj.ageRange
            .map(a => {
                const found = Object.values(CONSTANTS.AGES).find(age => age.v === a);
                return found ? found.kr : a;
            })
            .join(' · ');

    const sportLabel = CONSTANTS.SPORTS[obj.sport]?.kr || obj.sport;
    const periodLabel = period_Kor[obj.period] || obj.period;
    const levelLabel = level_Kor[obj.level] || obj.level;
    const acceptLabel = accept_Kor[obj.isAutoAccept] || obj.isAutoAccept;
    return {
        ...obj,
        dayLabel,
        ageLabel,
        sportLabel,
        periodLabel,
        levelLabel,
        acceptLabel
    };
}

async function crewLike(regularCrewId, userId) {
    const crew = await regularCrew.findById(regularCrewId);
    const isLiked = crew.likedBy.some(id => id.toString() === userId.toString());
    await regularCrew.findByIdAndUpdate(regularCrewId,
        isLiked ? { $pull: {likedBy: userId}, $inc: {reputation: -1} } : { $push: {likedBy: userId}, $inc: {reputation: 1}}
    ); // $inc : 몽고DB 숫자 필드 증가 연산자
}

module.exports = { createRegCrew, findCrewsByUserId, getMyCrews, deleteMyCrew, getCrewDetail, withdrawMyCrew, crewLike ,getRegularCrews, getRegularAPICrews};
