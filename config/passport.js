const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const NaverStrategy = require('passport-naver-v2').Strategy;
const bcrypt = require('bcrypt');
const userService = require('../services/userService');

passport.use(new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await userService.findUserByEmail(email);
        if(!user) {
            return done(null, false, {message: '이메일 또는 비밀번호가 일치하지 않습니다.'});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return done(null, false, {message: '비밀번호가 일치하지 않습니다.'});
        }
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// 구글 로그인
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async(asscessToken, refreshToken, profile, done) =>{
    try {
        const email = profile.emails[0].value;//인증된 회원의 이메일
        
        //기존 이메일로 가입된 회원이 DB에 있으면 로그인
        let user = await userService.findUserByEmail(email);
        if(user){
            return done(null, user);
        }

        //구글에서 가져온 회원의 정보로 새로운 회원 생성
        const newUser = await userService.createSocialUser(
            {
                email,
                name: profile.displayName,  //구글에서 제공하는 이름
                profileImage: profile.photos[0].value,  //구글에서 제공하는 프로필 사진
                address: '',
                provider: 'google'
            }
        );
        // 로그인
        return done(null, newUser);

    } catch (error) {
        return done(error);
    }
}));

// 네이버 로그인
passport.use(new NaverStrategy({
    clientID: process.env.NAVER_CLIENT_ID, 
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    callbackURL: '/auth/naver/callback'
}, async(asscessToken, refreshToken, profile, done) =>{
    try {
        const email = profile.email;
        
        //기존 이메일로 가입된 회원이 DB에 있으면 로그인
        let user = await userService.findUserByEmail(email);
        if(user){
            return done(null, user);
        }

        //네이버에서 가져온 회원의 정보로 새로운 회원 생성
        const newUser = await userService.createSocialUser(
            {
                email,
                name: profile.name,  //네이버에서 제공하는 이름
                profileImage: profile.profileImage,  //네이버에서 제공하는 프로필 사진
                address: '',
                provider: 'naver'
            }
        );
        // 로그인
        return done(null, newUser);

    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userService.findUserById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;