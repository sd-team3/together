    const mongoose = require('mongoose');
    const User = require('../models/User');
    const bcrypt = require('bcrypt');

    //회원가입 서비스(DB에 회원 객체 저장)
    async function createUser({ email, password, name, address, uploadFile, age, tel }) {

        //이메일 중복 체크
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = new Error('이미 사용중인 이메일입니다');
            error.status = 400;
            throw error;
        };

        //비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        //프로필 이미지 처리
        const profile = uploadFile ? uploadFile.filename : 'default-profile-image.jpg'
        console.log(profile);
        //회원 객체 생성
        const newUser = new User({
            email,
            password: hashedPassword,
            name,
            age: age ? Number(age) : null,
            tel: tel || '',
            address,
            profileImage: profile
        });

        //DB 저장
        await newUser.save();
        return newUser;

    }
    //email로 특정 회원 가져오기
    const findUserByEmail = async (email) => {
        return await User.findOne({ email });
    }

    //ID(고유값)로 특정 회원 가져오기
    const findUserById = async (id) => {
        return await User.findById(id);
    }

    // 회원 수정 전 비밀번호 확인
    async function verifyPassword (userId, password) {
        const user = await User.findById(userId);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error ('비밀번호가 일치하지 않습니다');
            error.status = 400;
            throw error;
        }
    }

    //회원수정
    async function updateUser(userId, { name, age, address, uploadFile, currentPassword, newPassword, tel, removeImage }) {

    // 1. 먼저 ID 체크
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error('사용자를 찾을 수 없습니다');
        error.status = 404;
        throw error;
    }

    // 2. 유저 조회
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다');
        error.status = 404;
        throw error;
    }

    // 3. 이미지 처리 (순서 중요)

    // 업로드 먼저
    if (uploadFile) {
        user.profileImage = uploadFile.filename;
    }

    // 삭제는 마지막 (덮어쓰기 방지)
    if (removeImage === "true") {
        user.profileImage = 'default-profile-image.jpg';
    }

        

        
    // 기본 정보 수정

    // 이름 검증
if (name !== undefined) {
    if (name.trim().length > 9) {
        const error = new Error("이름은 9자 이하만 가능합니다");
        error.status = 400;
        throw error;
    }
    user.name = name.trim();
}

    // 나이 검증
    if (age !== undefined) {
        const ageNum = Number(age);

        if (isNaN(ageNum) || ageNum < 1 || ageNum > 99) {
            const error = new Error("나이는 1~99세만 가능합니다");
            error.status = 400;
            throw error;
        }

        user.age = ageNum;
    }

    // 전화번호 검증
    if (typeof tel === 'string' && tel.trim() !== '') {
    const normalizedTel = tel.replace(/-/g, '').trim();

    // 010 강제
    const telRegex = /^010\d{8}$/;

    if (!telRegex.test(normalizedTel)) {
        const error = new Error("전화번호는 010-XXXX-XXXX 형식만 가능합니다");
        error.status = 400;
        throw error;
    }

    user.tel = normalizedTel;
}
    
        // 주소 변경
        if (address) {
        if (address.road !== undefined) user.address.road = address.road;
        if (address.detail !== undefined) user.address.detail = address.detail;
    }
        // 비밀번호 변경 (새 비밀번호에 값이 있을 때만)
      if (newPassword && newPassword.trim() !== '') {

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\-]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
        const error = new Error("비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다");
        error.status = 400;
        throw error;
    }

        password: 'SOCIAL_LOGIN',  
        age: 0,                 
        tel: '',               

        address: {                 
            state: '',
            city: '',
            road: ''
        },

    if (!isMatch) {
        const error = new Error('비밀번호가 틀립니다');
        error.status = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
}
        await user.save();
    }

    //회원 탈퇴
    async function deleteUser(userId, password) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            const error = new Error('사용자를 찾을 수 없습니다');
            error.status = 404;
            throw error;
        }
        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('사용자를 찾을 수 없습니다');
            error.status = 404;
            throw error;
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            const error = new Error('비밀번호가 일치하지 않습니다');
            error.status = 400;
            throw error;
        }
    
        await User.findByIdAndDelete(user.id);
    }

    async function checkEmail(email) {
        console.log(email);
        const user = await User.findOne({ email });
        return !user;
    }

    // 소셜 회원 DB 저장
    async function createSocialUser({ email, name, profileImage, provider }) {

        const newUser = new User({
            email,
            name,

            password: 'SOCIAL_LOGIN',  
            age: 0,                 
            tel: 'NONE',               

            address: {                 
                state: 'NONE',
                city: 'NONE',
                road: 'NONE'
            },

            profileImage,
            provider
        });

        await newUser.save();
        return newUser;
    }

    // 주소 나누는 함수
    function partAddress(fullAddress) {
        const parts = fullAddress.trim().split(/\s+/);

        return {state : parts[0],
                city : parts[1],
                road : parts.slice(2).join(' ')
                }
    }

    module.exports = { createUser, findUserByEmail, 
        findUserById, updateUser, deleteUser, checkEmail, createSocialUser, verifyPassword };
