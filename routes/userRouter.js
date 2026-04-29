const express = require('express');
const router = express.Router();
const {signupValidationRules, validate} = require('../middlewares/validationMiddleware')
const userController = require('../controllers/userController');
const passport = require('../config/passport');
const {uploadProfile} = require('../config/upload');

//회원가입 페이지
router.get('/signup', userController.getSignup);

router.post(
  '/signup',
  uploadProfile.single('uploadFile'),
  signupValidationRules,
  validate('user/signup'), 
  userController.postSignup
);

//로그인 페이지
router.get('/login', userController.getLogin);

//로그인 처리
router.post('/login', passport.authenticate('local', {
    successRedirect: '/',           //성공 시 메인페이지
    failureRedirect: '/user/login', //실패 시 로그인페이지
    failureMessage: true            
}));

//로그아웃 처리
router.get('/logout', userController.logout);

//마이페이지
router.get('/profile', userController.getProfile);

//회원수정 페이지
router.get('/edit-profile', userController.getEditProfile);

//회원수정 처리
router.post('/edit-profile', uploadProfile.single('uploadFile'), userController.postEditProfile);

//회원탈퇴 페이지
router.get('/delete', userController.getDelete);

//회원탈퇴 처리
router.post('/delete', userController.postDelete);

//이메일 중복확인
router.get('/check-email', userController.checkEmail);

module.exports = router;