const userService = require('../services/userService');

const getJoin = (req, res) => {
    res.render('user/signup');
};

const postJoin = async(req, res) => {
    try {
        const {email, password, name, age, tel} = req.body;
        const dummyaddress = {
            state : '경기도',
            city : '의정부시',
            road : '평화로 123번길',
            x : 127.0461,
            y : 37.7381,
        }
        await userService.createUser({email, password, name, age, tel, address : dummyaddress});
        console.log('회원가입완료');
        res.redirect('/');
    } catch (error) {  
        console.error(error);
    }
};

const getLogin = (req, res) => {
    res.render('user/signup');
};

module.exports = {getJoin, postJoin, getLogin};