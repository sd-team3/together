const userService = require('../services/userService');
const regularService = require('../services/crew/regularService');
const instantService = require('../services/crew/instantService');
const User = require('../models/User');

//# 회원 가입 페이지
const getSignup = (req, res) => {
    res.render('user/signup', {
        errors: {},
        socialUser: req.session.socialUser || null
    });
};

//# 회원 가입 처리
const postSignup = async (req, res, next) => {
    try {
        const socialUser = req.session.socialUser || null;

        const {
            email,
            password,
            name,
            age,
            tel,
            state,
            city,
            road,
            addressDetail,
            zipcode,
            gender
        } = req.body;

      

        const result = await userService.createUser({
            email,
            password: socialUser ? socialUser.password : password,
            name,
            age,
            tel,
            gender,
            address: {
                state,
                city,
                road,
                detail: addressDetail,
                zipcode
            },
            provider: socialUser ? socialUser.provider : 'local',
            uploadFile: req.file
        });


        delete req.session.socialUser;

req.login(result, (err) => {

            if (err) {
                return next(err);
            }
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, name: result.name });
            }

            return res.redirect('/');

        });
    } catch (error) {
        
        if (error.code === 11000) {
            return res.render('user/signup', {
                errors: {
                    email: error.message
                },
                socialUser: req.session.socialUser || null
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
    const user = await userService.findUserById(req.user.id);
    const regCrew = await regularService.findRegularCrewsByUserId(req.user.id);
    const instantCrew = await instantService.findInstantCrewsByUserId(req.user.id);
    res.render('user/profile', { user, regCrew, instantCrew});
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
        zonecode: zipcode,
        gender,
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
                detail,
                zipcode
            },
            gender,
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

//회원 탈퇴 처리
const postDelete = async (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/user/login');
    const password = req.body.password;
    try {
        await userService.deleteUser(req.user.id, password);
        req.logout((err) => {
            if (err) return next(err);
            res.json({ success: true });
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

//중복확인
const checkEmail = async (req, res, next) => {
    const { email } = req.query;
    try {
        const available = await userService.checkEmail(email);
        res.json({ available });//DB에 해당 email이 있으면 false, 없으면 true
    } catch (error) {
        next(error);
    }

}
// 설정 페이지
const getSetting = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/user/login');
  }
  res.render('user/setting', { user: req.user });
};

//유저 api
const getUserProfile = async (req, res) => {
    try {
        const targetId = req.params.userId;
        const myId = req.user?._id;

        const user = await userService.findUserById_WithoutPW(targetId);
        if (!user) return res.status(404).json({ ok: false });

        // 프로필 비공개 체크
        const visibility = user.privacy?.profileVisibility || 'all';
        if (visibility === 'none' && myId?.toString() !== targetId.toString()) {
            return res.json({ ok: false, reason: 'private' });
        }

        // 활동이력 공개 여부
        const showHistory = user.privacy?.showHistory !== false;

        // 크루 정보
        let crews = [];
        if (showHistory) {
            const regularCrew = require('../models/regularCrew');
            const rawCrews = await regularCrew.find({
                'member.memberList.user': targetId
            }).select('title sport address sportEmoji profileImage').lean();

            crews = rawCrews.map(c => ({
                title: c.title,
                sport: c.sport,
                address: c.address?.city || '',
                sportEmoji: c.sportEmoji || '🏅'
            }));
        }

        // 친구 여부 확인
        let friendInfo = null;
        if (myId) {
            const me = await userService.findUserById(myId);
            const friendEntry = me.friends?.find(f => f.user.toString() === targetId.toString());
            if (friendEntry) {
                friendInfo = { since: friendEntry.createdAt || null };
            }
        }

        res.json({ ok: true, user, crews, friendInfo });
    } catch (err) {
        console.error('getUserProfile:', err);
        res.status(500).json({ ok: false });
    }
};

//프로필 비공개
const updatePrivacy = async (req, res) => {
    try {
        const { key, value } = req.body;
        const allowedKeys = ['priv-profile', 'priv-history', 'priv-manner'];
        if (!allowedKeys.includes(key)) return res.status(400).json({ ok: false });

        const fieldMap = {
            'priv-profile': 'privacy.profileVisibility',
            'priv-history': 'privacy.showHistory',
            'priv-manner':  'privacy.showManner'
        };

        await User.findByIdAndUpdate(req.user._id, {
            $set: { [fieldMap[key]]: value }
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
};

module.exports = { getSignup, postSignup, getLogin, logout, getProfile, getEditProfile, postEditProfile, postDelete, checkEmail, getVerify, postVerify,getSetting, getUserProfile, updatePrivacy };
