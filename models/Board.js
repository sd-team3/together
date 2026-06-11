const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
    {
        title : {type: String, required : true},
        content : {type : String, required : true},
        author : {type : mongoose.Schema.Types.ObjectId, ref : 'User', required : true},
        // ref : 내가 무엇을 참조하는지 
        // author : User 컬렉션 참조
        // 몽고 DB에서 기본키를 만들어 유저의 기본키를 가져옴
        category : {
            type : String, 
            enum : ['question', 'tip', 'free'], // 카테고리 값을 제한함
            required : true
        },
        // enum : 열거형, 속성에 허용되는 값들을 제한
        file : {type : String, default : null},
        reputation: { type: Number, default: 0 },
        likedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        commentsCount: { type: Number, default: 0 }
    }, {
        timestamps : true
    }
);

const Board = mongoose.model('Board', boardSchema);
module.exports = Board;