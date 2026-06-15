const mongoose = require('mongoose');

const messageSchema =  new mongoose.Schema (
    {
        room : { type : mongoose.Schema.Types.ObjectId, ref : "ChatRoom", required : true, index : true},
        sender : {type : mongoose.Schema.Types.ObjectId, ref : "User", required : false, default: null},
        content : {type : String, required : true},
        isRead : { type : Boolean, default : false}
    },
    {
        timestamps : true,
    }
);

// 특정 채팅방의 메시지를 시간순으로 빠르게 가져오기 위한 인덱스
messageSchema.index({ room: 1, createdAt: 1 });
// 최신 메시지를 먼저 가져올 때 사용
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);