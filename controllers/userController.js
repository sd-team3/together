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
        console.log("REQ BODY:", req.body);
        const {
            email,
            password,
            name,
            age,
            tel,
            state,
            city,
            road,
            x,
            y
        } = req.body;

        await userService.createUser({
            email,
            password,
            name,
            age: age ? Number(age) : null,
            tel: tel || '',
            address: {
                state,
                city,
                road
               
            },
            uploadFile: req.file
        });

        res.redirect('/');
    } catch (error) {
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
    
    //성공메세지 출력 >>> ejs
    const successMessage = req.session.successMessage;
    req.session.successMessage = null;

    res.render('user/profile', { successMessage });
};

//회원 수정 페이지
const getEditProfile = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }//인증되지 않은 사용자가 회원수정 페이지 요청 시 로그인 페이지로 이동
    res.render('user/edit-profile', {
        user: req.user,
        errorMessage: null,
        errors: {},
        oldInput: {}
    });
}

//회원 수정 처리
const postEditProfile = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }
    //회원정보 수정
    const {
        currentPassword,
        newPassword,
        name,
        state,
        city,
        road,
        x,
        y
    } = req.body;
    if (newPassword && newPassword.trim() !== '') {
        if (!currentPassword) {
        return res.render('user/edit-profile', {
            user: req.user,
            errorMessage: '현재 비밀번호를 입력해주세요',
            errors: {},
            oldInput: req.body
        });
        }
    }
    try {
        const address = {
            state: state || req.user.address?.state || '',
            city: city || req.user.address?.city || '',
            road: road || req.user.address?.road || ''
        };

        await userService.updateUser(req.user.id, {
            currentPassword,
            newPassword,
            name,
            address,
            uploadFile: req.file
        });
        
        req.session.successMessage = '회원정보가 수정되었습니다';
   
        //수정 후 마이페이지로 이동
        res.redirect('/user/profile');

    } catch (error) {
       return res.render('user/edit-profile', {
            user: req.user,
            errorMessage: error.message,
            errors: {},
            oldInput: req.body
        });
}
}

//회원탈퇴 페이지
const getDelete = (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }
    res.render('user/delete', {
    errorMessage: null
});
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

//비밀번호 변경


module.exports = { getSignup, postSignup, getLogin, logout, getProfile, getEditProfile, postEditProfile, getDelete, postDelete, checkEmail };
