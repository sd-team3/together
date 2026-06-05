const mongoose = require('mongoose');
const User = require('./User');

const chatRoomSchema = new mongoose.Schema (
    {
        name : {type : String, required : true},
        crewId: { type: mongoose.Schema.Types.ObjectId, default: null },
        crewType: { type: String, enum: ['regular', 'instant'], default: 'regular' },
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

chatRoomSchema.index({ lastMessageAt : -1 });
chatRoomSchema.index({ "members.user" : 1 });
chatRoomSchema.index({ noticeOffMembers : 1 });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);