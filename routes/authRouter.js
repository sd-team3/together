const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

router.get('/google/callback', (req, res, next) => {

    console.log('1. callback 진입');

    passport.authenticate('google', {
        session: false
    }, (err, user, info) => {

        console.log('2. authenticate 완료');
        console.log('err:', err);
        console.log('user:', user);
        console.log('info:', info);

        if (err) {
            console.log('3. err 발생');
            return next(err);
        }

        if (!user) {
            console.log('4. user 없음');
            return res.redirect('/user/login');
        }

        if (user.isSocialNewUser) {

            console.log('5. 신규회원');

            req.session.socialUser = user;

            console.log('6. session 저장 완료');

            return res.redirect('/user/signup');
        }

        console.log('7. 기존회원 로그인 시도');

        req.login(user, (loginErr) => {

            console.log('8. req.login 내부');

            if (loginErr) {
                console.log('9. loginErr:', loginErr);
                return next(loginErr);
            }

            console.log('10. 로그인 성공');

            return res.redirect('/');
        });

    })(req, res, next);

});

router.get('/naver',
    passport.authenticate('naver')
);

router.get('/naver/callback', (req, res, next) => {

    passport.authenticate('naver', {
        session: false
    }, (err, user, info) => {

        if (err) {
            return next(err);
        }

        // 진짜 실패
        if (!user) {
            return res.redirect('/user/login');
        }

        // 신규 소셜 회원
        if (user.isSocialNewUser) {

            req.session.socialUser = user;

            return res.redirect('/user/signup');
        }

        // 기존 회원 로그인
        req.login(user, (loginErr) => {

            if (loginErr) {
                return next(loginErr);
            }

            return res.redirect('/');
        });

    })(req, res, next);

});

module.exports = router;