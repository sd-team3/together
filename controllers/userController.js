const userService = require('../services/userService');

//# 회원 가입 페이지
const getSignup = (req, res) => {
    res.render('user/signup', {
        errors: {}
    });
};

//# 회원 가입 처리
const postSignup = async (req, res, next) => {
    try {
        const { email, password, name, age, tel, state, city, road, addressDetail } = req.body;

        await userService.createUser({
            email,
            password,
            name,
            age,
            tel,
            address: {
                state,
                city,
                road,
                detail: addressDetail
            },
            uploadFile: req.file
        });

        res.redirect('/');
    } catch (error) {
        if (error.code === 11000) {
        return res.render('user/signup', {
            errors: {
                email: error.message
            }
        });
    }

        return next(error);
    }
};

// 로그인 페이지
const getLogin = (req, res) => {
    const messages = req.session.messages || [];
    const errorMessage = messages[messages.length - 1] || null;
    req.session.messages = [];
    res.render('user/login', { errorMessage });
};

//로그아웃 처리
const logout = (req, res, next) => {
    req.logout((error) => {
        if (error) {
            return next(error);
        }
        res.redirect('/user/login');
    })
}

//마이페이지
const getProfile = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }//인증되지 않은 사용자가 마이페이지 요청 시 로그인 페이지로 이동
    res.render('user/profile');
};

//회원 수정 페이지
const getEditProfile = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }//인증되지 않은 사용자가 회원수정 페이지 요청 시 로그인 페이지로 이동
    res.render('user/edit-profile', {
        user: req.user  
    });
}

// 회원 수정 전 비밀번호 인증 페이지
const getVerify = async (req, res) => {
//    if (!req.isAuthenticated()) {
//         return res.redirect('/user/login');
//    }
   res.render('user/verify-password', {error : {} });
}

// 회원 수정 전 비밀번호 인증 처리
const postVerify = async (req, res, next) => {
//    if (!req.isAuthenticated()) {
//         return res.redirect('/user/login');
//    }
    const { password }= req.body;
    try {
        await userService.verifyPassword(req.user.id, password);
        res.redirect('/user/edit-profile');
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).render('/user/verify-password', {error : error.message});
        }
        return next(error);
    }
}

//회원 수정 처리
const postEditProfile = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }
    //회원정보 수정



    const { name, age,tel, state, city, road, currentPassword, newPassword } = req.body;

    try {
        await userService.updateUser(req.user.id, {
            name,
            age,
            tel,
            address: {
                state,
                city,
                road
            },
            currentPassword,
            newPassword,
            uploadFile: req.file
        });


        res.redirect('/user/profile');
    } catch (error) {
        return next(error);
    }
};

//회원탈퇴 페이지
const getDelete = (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }
    res.render('user/delete');
}

//회원탈퇴 처리
const postDelete = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }
    const password = req.body.password;
    try {
        await userService.deleteUser(req.user.id, password);
        res.redirect('/');
    } catch (error) {
        next(error);
    }
}

//중복확인
const checkEmail = async (req, res, next) => {
    const { email } = req.query;
    try {
        const available = await userService.checkEmail(email);
        console.log(available);
        res.json({ available });//DB에 해당 email이 있으면 false, 없으면 true
    } catch (error) {
        next(error);
    }

}

module.exports = { getSignup, postSignup, getLogin, logout, getProfile, getEditProfile, postEditProfile, getDelete, postDelete, checkEmail, getVerify, postVerify };
