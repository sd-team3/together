const mongoose = require('mongoose');
const Board = require('../../models/Board');
const Comment = require('../../models/Comment');

async function getBoard(page) {
    const limit = 9;
    const skip = (page - 1) * limit;

    const totalBoard = await Board.countDocuments({});
    const totalPages = Math.ceil(totalBoard / limit);
    const boards = await Board.find({})
                              .populate('author', 'name')
                              .sort({ createdAt: -1 })
                              .skip(skip)
                              .limit(limit);

    return { boards, totalPages, currentPage: page };
}

async function getBoardByCategory(query, page, sort = 'latest') {
    const limit = 9;
    const skip = (page-1) * limit;
    const sortOption = sort === 'popular' ? { reputation: -1 } : { createdAt: -1 }; 

    const totalBoard = await Board.countDocuments(query);
    const totalPages = Math.ceil(totalBoard/limit);
    const boards = await Board.find(query)
                                .populate('author', 'name')
                                .sort (sortOption)
                                .skip(skip)
                                .limit(limit);
    return { boards, totalPages, currentPage: page };
}
// 좋아요
async function boardLike(boardId, userId) {
    const board = await Board.findById(boardId);
    const isLiked = board.likedBy.some(id => id.toString() === userId.toString());
    await Board.findByIdAndUpdate(boardId,
        isLiked
            ? { $pull: { likedBy: userId }, $inc: { reputation: -1 } }
            : { $push: { likedBy: userId }, $inc: { reputation: 1 } }
    );
}


module.exports = {getBoard, getBoardByCategory, boardLike};