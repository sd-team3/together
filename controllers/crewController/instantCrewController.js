const { CONSTANTS } = require('../../config/constants');
const instantCrewService = require('../../services/crew/instantCrewService');

const getInstant = async (req, res) => {
    try {
        const crews = await instantCrewService.getInstantCrew();
        res.render('crew/instantCrew', { CONSTANTS, crews });
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
};


const getInstantCreate = (req, res) => {
    res.render('crew/instantCreate', {CONSTANTS:CONSTANTS});
}

const postInstantCreate = async (req, res) => {
    try {
        if(!req.isAuthenticated()){
            return res.redirect('/user/login');
        }
        const host = req.user._id;
        const data = req.body;

        data.isAutoAccept = (data.isAutoAccept === 'enable');

        const result = await instantCrewService.createInstantCrew(data, host);

        if(result.success) {
            return res.redirect('/');
        } else {
            return res.status(400).send();
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('서버 오류가 발생했습니다.');
    }
};
 module.exports = {getInstantCreate, postInstantCreate, getInstant};