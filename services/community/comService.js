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

async function createBoard(title, content, author, category, file) {
    const newBoard = new Board({
        title, content, author, category, file: file ? file.filename : null,
    });
    await newBoard.save();
}
async function getDetail(boardId) {
    const board = await Board.findById(boardId)
                            .populate('author', 'name');
    return board;
}

async function getComments(boardId) {
    const comments = await Comment.find(boardId)
                                  .populate('author', 'name')
                                  .sort({ createdAt : -1 });
    return comments;
}

async function createComment(boardId, content, userId) {
    const comment = new Comment({
        content,
        author : userId,
        board : boardId
    });
    await comment.save();
    await Board.findByIdAndUpdate(boardId, { $inc: { commentsCount: 1 } });
    return comment;
}

async function updateBoard(boardId, title, content) {
    await Board.findByIdAndUpdate(boardId, { title, content });
}

async function deleteBoard(boardId) {
    await Board.findByIdAndDelete(boardId);
    await Comment.deleteMany({ board: boardId }); // 게시글 삭제 시 댓글도 같이 삭제
}

async function updateComment(commentId, content) {
    await Comment.findByIdAndUpdate(commentId, { content });
}

async function deleteComment(commentId) {
    await Comment.findByIdAndDelete(commentId);
    await Board.findByIdAndUpdate(comment.board, { $inc: { commentsCount: -1 } });
}

async function getWeeklyPopular() {
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate()-7);

    const boards = await Board.find({ createdAt : {$gte : oneWeek }})
                              .populate('author', 'name')
                              .sort({ reputation : -1 })
                              .limit(5);
    return boards;                          
}

async function handleUserDeleted(userId) {
    // 게시글 author null 처리
    await Board.updateMany(
        { author: userId },
        { $set: { author: null } }
    );

    // 댓글 author null 처리
    await Comment.updateMany(
        { author: userId },
        { $set: { author: null } }
    );
}


module.exports = {
    getBoard, getBoardByCategory, getDetail, getComments, createBoard ,boardLike, createComment,
    updateComment,deleteComment,updateBoard ,deleteBoard, getWeeklyPopular, handleUserDeleted
 };
