const mongoose = require('mongoose');
const User = require('./User');

const chatRoomSchema = new mongoose.Schema (
    {
        name : {type : String, required : true},
        crewId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegularCrew', default: null }, // 크루 값
        members : [
            {user: {type : mongoose.Schema.Types.ObjectId, ref : "User", required : true},
             isMuted :{ type : Boolean, default : false }}
        ],
        lastMessage : {type : mongoose.Schema.Types.ObjectId, ref : "Message"},
        type : {type : String, enum : ["direct", "group"], default : "group"},
        lastMessageAt : {type : Date, default : null},
        noticeOffMembers : [{type : mongoose.Schema.Types.ObjectId, ref : "User"}]
    },
    {
        timestamps : true,
    }
);
// 최근 메시지순 채팅방 인덱스
chatRoomSchema.index({ lastMessageAt : -1 });
// 특정 유저 있는 채팅방 인덱스
chatRoomSchema.index({ "members.user" : 1 });
// 알림을 끈 멤버 인덱스
chatRoomSchema.index({ noticeOffMembers : 1 });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);