const mongoose = require('mongoose');
const User = require('./User');

const chatRoomSchema = new mongoose.Schema (
    {
        name : {type : String, required : true},
        members : [
            {user: {type : mongoose.Schema.Types.ObjectId, ref : "User", required : true},
             isMuted :{ type : Boolean, default : false }}
        ],
        lastMessage : {type : mongoose.Schema.Types.ObjectId, ref : "Message"},
        type : {type : String, enum : ["direct", "group"], default : "group"},
        lastMessageAt : {type : Date, default : null}
    },
    {
        timestamps : true,
    }
);
// 최근 메시지순 채팅방 인덱스
chatRoomSchema.index({ lastMessageAt : -1 });
// 특정 유저 있는 채팅방 인덱스
chatRoomSchema.index({ members : 1 });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);