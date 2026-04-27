const express = require('express');
const router = express.Router();
const User = require('../models/User');
const userController = require('../controllers/userController');
// 회원가입 페이지
router.get('/signup', userController.getJoin);

//회원가입 처리
router.post('/signup', userController.postJoin);


module.exports = router;