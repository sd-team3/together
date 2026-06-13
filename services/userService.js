const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const instantCrew = require('../models/instantCrew');
const crewApplication = require('../models/crewApplication');
const chatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

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

    // 소셜 사용자는 비번 검증 스킵
    if (user.provider === 'local') {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = new Error('비밀번호가 일치하지 않습니다');
            error.status = 400;
            throw error;
        }
    }

    // 내가 호스트인 모임 찾기
    const myCrews = await instantCrew.find( { host: userId });
    const myCrewIds = myCrews.map(c => c._id);

    // 연관 데이터 삭제
    await crewApplication.deleteMany({ crewId: { $in : myCrewIds }});
    await chatRoom.deleteMany({ crewId: { $in: myCrewIds }});
    await Message.deleteMany( { crewId: { $in: myCrewIds }});
    
    //(임시) 호스트 탈퇴시 모임 삭제
    await instantCrew.deleteMany({ host: userId });

    // 내가 멤버로만 있는 모임에서 제거
    await instantCrew.updateMany(
        { 'member.memberList.user': userId },
        { $pull: {'member.memberList' : {user: userId }}}
    );

    await User.findByIdAndDelete(user.id);
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

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    deleteUser,
    checkEmail,
    verifyPassword,
    findUserById_WithoutPW
};