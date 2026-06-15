const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        content : {type : String, required : true},
        author : {type : mongoose.Schema.Types.ObjectId, ref : 'User', required : false, default: null},
        board : {type : mongoose.Schema.Types.ObjectId, ref : 'Board', required : true }
    }, {
        timestamps : true
    });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;