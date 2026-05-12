const userService = require('../services/userService');
const regCrewService = require('../services/crew/regCrewService')

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
    }
    const user = await userService.findUserById(req.session.user.id);
    const regCrew = await regCrewService.findCrewsByUserId(req.session.user.id);
    const dayMap = { 'mon' : '월', 'tue' : '화', 'wed' : '수', 'thu' : '목', 'fri' : '금', 'sat' : '토', 'sun' : '일', 'none' : '미정'};
    regCrew.forEach(crew => {
        crew.day = crew.day.map(d => dayMap[d] || d);
    });
    res.render('user/profile', { user, regCrew });
};


//회원 수정 페이지
const getEditProfile = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/user/login');
    }

    const user = await userService.findUserById(req.user.id);

    res.render('user/edit-profile', {
        user
    });
};

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
            return res.status(400).render('user/verify-password', {error : error.message});
        }
        return next(error);
    }
}

//회원 수정 처리
const postEditProfile = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "로그인 필요" });
    }

    const {
        name,
        age,
        tel,
        state,
        city,
        road,
        detail,
        currentPassword,
        newPassword,
        removeImage
    } = req.body;

    try {
        const user = await userService.findUserById(req.user.id);

        let profileImage = user.profileImage; // 기본 유지

        // 삭제 요청
        if (removeImage === "true") {
            profileImage = null;
        }

        // 새 업로드
        if (req.file) {
            profileImage = req.file.filename;
        }

        await userService.updateUser(req.user.id, {
            name,
            age,
            tel,
            address: {
                state,
                city,
                road,
                detail
            },
            currentPassword,
            newPassword,
            removeImage, 
            uploadFile: req.file
        });

        res.json({ message: "변경 완료" });

    } catch (error) {
        console.error("에러 위치:", error);

        if (error.status === 400) {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: error.message || "서버 내부 오류"
        });
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
