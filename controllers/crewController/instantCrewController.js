 const { CONSTANTS } = require('../../config/constants');
 const instantCrewService = require('../../services/crew/instantCrewService');

 const getInstantCreate = (req, res) => {
    res.render('crew/flashCreate', {CONSTANTS:CONSTANTS});
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
 module.exports = {getInstantCreate, postInstantCreate};