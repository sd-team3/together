const getRegularCreate = (req, res)=>{
    res.render('crew/regular_create');
}

const postRegularCreate = async (req, res)=>{
    try {
        const sport = document.querySelector('.chip.on').dataset.value;
        const host = req.user._id;
        const { title, intro, capacity, period, day, ageRange, address, fee, profileImage } = req.body;
        const crew = { title, intro, host, capacity, period, day, ageRange, address, sport, fee, profileImage };

        await regCrewService.createCrew(crew);
        res.redirect('crew/regular');
    } catch (error) {
        
    }
};