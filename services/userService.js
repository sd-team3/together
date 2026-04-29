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
    const profile = uploadFile ? uploadFile.filename : 'default-profile.png'
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
async function updateUser(userId, { name, age,address, uploadFile, currentPassword, newPassword, tel }) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error('사용자를 찾을 수 없습니다');
        error.status = 404;
        throw error;
    }

    const user = await User.findById(userId);
    if (uploadFile) {
        user.profileImage = uploadFile.filename;
    }

    if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
    }
    user.name = name;
    user.age = age;
    user.tel = tel;
    // 주소 변경
    if (address && address.full) {
        const { state, city, road } = partAddress(address.full);

        user.address = {state, city, road, detail : address.detail};
    }
    // 비밀번호 변경 (새 비밀번호에 값이 있을 때만)
    if (newPassword && newPassword.trim() != '') {
        if (!currentPassword || currentPassword.trim() === '') {
            const error = new Error ('현재 비밀번호를 입력해주세요');
            error.status = 400;
            throw error;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            const error = new Error ('비밀번호가 틀립니다');
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
