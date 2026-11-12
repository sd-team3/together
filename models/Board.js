const mongoose = require('mongoose');
const { CONSTANTS } = require('../config/constants');

const boardSchema = new mongoose.Schema(
    {
        title : {type: String, required : true},
        content : {type : String, required : true},
        author : {type : mongoose.Schema.Types.ObjectId, ref : 'User', required : false, default: null},
        category : {
            type : String, 
            enum : ['question', 'tip', 'free'],
            required : true
        },
        sport: { type: String, enum: ['', ...Object.keys(CONSTANTS.SPORTS)], default: '' },
        views: { type: Number, default: 0 },
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