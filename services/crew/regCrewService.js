const mongoose = require('mongoose');
const regularCrew = require('../../models/regularCrew');

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

module.exports = {
    getRegularCrews, getRegularAPICrews
}