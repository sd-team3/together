const instantCrew = require('../../models/instantCrew');

async function getInstantCrew() {
    return await instantCrew.find()
        .populate('host', 'nickname')
        .sort({ createdAt: -1 });
}


async function createInstantCrew(data, host) {
    const { title, intro, sport, capacity, 
        state, city, lat, lng, isAutoAccept } = data;
    
    const crew = new instantCrew({
        title,
        intro,
        host,
        member: {
            capacity: Number(capacity),
            memberList: [{user: host}]
        },
        isAutoAccept,
        address: {
            state,
            city,
            lat: Number(lat),
            lng: Number(lng)
        },
        sport
    });
    try {
        await crew.save();
        return {success : true, data: crew};
    } catch (error) {
        console.error(error);
        throw error;
    }

}

module.exports = {createInstantCrew, getInstantCrew};