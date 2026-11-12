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

messageSchema.index({ room: 1, createdAt: 1 });
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);