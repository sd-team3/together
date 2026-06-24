const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const chatService = require('./chatService');
const friendService = require('./friendService');
const instantService = require('./crew/instantService');
const regularService = require('./crew/regularService');
const boardService = require('./community/comService'); 

//회원가입 서비스(DB에 회원 객체 저장)
async function createUser({ email, password, name, address, gender, uploadFile, age, tel,provider }) {



    //이메일 중복 체크
    const existingUser = await User.findOne({ email });


    if (existingUser) {
        const error = new Error('이미 사용중인 이메일입니다');
        error.status = 400;
        throw error;
    }


    //비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);


    //프로필 이미지 처리
    const profile = uploadFile ? uploadFile.filename : 'default-profile-image.jpg';

 
    const newUser = new User({
        email,
        password: hashedPassword,
        name,
        age: age ? Number(age) : null,
        tel: tel || '',
        gender, 
        address,
        profileImage: profile,
        provider: provider || 'local'
    });



    //DB 저장
    await newUser.save();

    

    return newUser;
}

//email로 특정 회원 가져오기
const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

//ID로 회원 가져오기
const findUserById = async (id) => {
    return await User.findById(id);
};

const findUserById_WithoutPW = async (id) => {
    return await User.findById(id).select('-password');
};

// 비밀번호 확인
async function verifyPassword(userId, password) {



    const user = await User.findById(userId);

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        const error = new Error('비밀번호가 일치하지 않습니다');
        error.status = 400;
        throw error;
    }
}

// 회원수정
async function updateUser(userId, { name, age, address, uploadFile, currentPassword, newPassword, tel, removeImage }) {



    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('사용자를 찾을 수 없습니다');
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
    }

    if (uploadFile) {
        user.profileImage = uploadFile.filename;
    }

    if (removeImage === "true") {
        user.profileImage = 'default-profile-image.jpg';
    }

    if (name !== undefined) {
        user.name = name.trim();
    }

    if (age !== undefined) {
        user.age = Number(age);
    }

    if (tel) {
    user.tel = tel.trim();
}

    if (address) {
        if (address.state !== undefined) user.address.state = address.state;
        if (address.city !== undefined) user.address.city = address.city;
        if (address.road !== undefined) user.address.road = address.road;
        if (address.detail !== undefined) user.address.detail = address.detail;
        if (address.zipcode !== undefined) user.address.zipcode = address.zipcode;
    }

    if (newPassword && newPassword.trim() !== '') {

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
        const error = new Error('현재 비밀번호가 틀립니다');
        error.status = 400;
        error.field = 'currentPassword';  
        throw error;
}

        user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();


}

//회원 탈퇴
async function deleteUser(userId, password) {
    const user = await User.findById(userId);

    //소셜 사용자는 비번 스킵
    if (user.provider === 'local') {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error('비밀번호가 일치하지 않습니다');
            error.status = 400;
            throw error;
        }
    }

    await chatService.handleUserDeleted(userId);
    await friendService.handleUserDeleted(userId);
    await instantService.handleUserDeleted(userId);
    await regularService.handleUserDeleted(userId);
    await boardService.handleUserDeleted(userId);
    await notiService.handleUserDeleted(userId);
    await User.findByIdAndDelete(userId);
}

async function checkEmail(email) {
    const user = await User.findOne({ email });
    return !user;
}

// 주소 나누기
function partAddress(fullAddress) {
    const parts = fullAddress.trim().split(/\s+/);

    return {
        state: parts[0],
        city: parts[1],
        road: parts.slice(2).join(' ')
    };
}

async function getUserName(userId) {
    try {
        // 🚨 주의: 본인 스키마에 이름이 'name'인지 'nickname'인지에 따라 'name' 부분을 바꿔주세요!
        const user = await User.findById(userId).select('name').lean();
        
        // 유저가 존재하면 이름을, 삭제됐거나 못 찾으면 '알 수 없는 유저' 반환
        return user ? user.name : '알 수 없는 유저';
    } catch (error) {
        console.error('유저 이름 조회 에러:', error.message);
        return '알 수 없는 유저';
    }
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    deleteUser,
    checkEmail,
    verifyPassword,
    findUserById_WithoutPW,
    getUserName
};