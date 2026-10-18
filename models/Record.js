const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');

const recordSchema = new mongoose.Schema(
    {
        user : {
            type : mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required : true
        },
        // 기존 개인 기록도 그대로 조회할 수 있도록 모임 정보는 선택 필드다.
        crewType: { type: String, enum: ['regular', 'instant'] },
        crewId: { type: mongoose.Schema.Types.ObjectId },
        activityId: { type: mongoose.Schema.Types.ObjectId },
        crewTitle: { type: String },
        activityTitle: { type: String },
        // 응답을 받지 못한 요청을 재시도해도 한 번만 저장한다.
        submissionId: { type: String, unique: true, sparse: true },
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
