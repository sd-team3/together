const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');

const recordSchema = new mongoose.Schema(
    {
        user : {
            type : mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required : true
        },
        sport : {
            type : String,
            required : true,
            enum : Object.keys(CONSTANTS.SPORTS)
        },
        exerciseDate : {
            type : String,
            required : true,
            match : /^\d{4}-\d{2}-\d{2}$/
        },
        mood : {
            type : Number,
            required  :true,
            enum : [1, 2, 3, 4, 5]
        },
        good: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ''
        },
        improve: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ''
        },
        goal: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ''
        }
    },
    {
        timestamps : true
    }
);

recordSchema.index({
    user: 1,
    exerciseDate : -1,
    _id : -1
});

module.exports = mongoose.model('Record', recordSchema);