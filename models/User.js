const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        road: {
            type: String,
            required: true
        },
        
    }, {
        _id: false
    }
);

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        age: {
            type: Number,
            required: true
        },
        tel: {
            type: String,
            required: true
        },
        address: {
            type: addressSchema,
            required: true
        },
        profileImage: {
            type: String, 
            //여기에 저장하는 파일은 images/user-profile/<userId>-<DateTime>.jpg 형식으로 저장됨
            //폴더나 파일 명은 적절하다고 생각하는 한도에서 사용 
            default: 'default-profile-image.jpg'
        },
        provider: {
            type: String,
            enum: ['local', 'google', 'naver'],
            default: 'local'
        }
    }, {
        timestamps: true
    }
);

const User = mongoose.model('User', userSchema);

module.exports = User;