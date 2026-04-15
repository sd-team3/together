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
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        }
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
        }
    }, {
        timestamps: true
    }
);

const User = mongoose.model('User', userSchema);

module.exports = User;