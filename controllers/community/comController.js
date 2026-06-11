const mongosse = require('mongoose');
const comService = require('../../services/community/comService');
const Board = require('../../models/Board');

const getCommunity = async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    try {
        const result = await comService.getBoard(page);            
        res.render('community/comList', {
            title : '게시판 페이지', 
            boards: result.boards,
            currentPage: result.currentPage,
            totalPages : result.totalPages,
        });
    } catch (error) {
        next(error);
    }
}

const getListAPI = async (req, res, next) => {
    const category = req.params.category;
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'latest';
    let search = {};
    try {

        if ( category !== 'all') {
            search.category = category;
        }
        const {boards, totalPages, currentPage} = await comService.getBoardByCategory(search, page, sort);
        res.status(200).json({ boards, totalPages, currentPage });
    } catch (error) {
        next(error);
    }
}

const postBoardLike = async (req, res, next) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }
        await comService.boardLike(req.params.boardId, req.user._id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

const getWrite = async (req, res) => {
    res.render('community/write');
}

const postWrite = async (req, res, next) => {
    try {
        const { title, content, category } = req.body;
        await comService.createBoard(
            title,
            content,
            req.user.id,
            category,
            req.file
        );
        res.redirect('/community/list');
    }catch(error) {
        next(error);
    }
}

const getDetail = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const board = await comService.getDetail(boardId);
        const comments = await comService.getComments({ board : boardId });
        const userId = req.isAuthenticated() ? req.user._id : null;
        const isLiked = userId && board.likedBy
            ? board.likedBy.some(id => id.toString() === userId.toString())
            : false;
        
        res.render("community/comDetail", { board, comments, userId, isLiked });
    } catch (error) {
        next(error);
    }
}

const postComment = async (req, res, next) => {
    try {
        const {boardId} = req.params;
        const {content } = req.body;
        await comService.createComment(boardId, content , req.user._id);
        res.status(201).json({ success: true });
    } catch (error) {
        next(error);
    }
}

const getEditBoard = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const board = await comService.getDetail(boardId);
        res.render('community/comEdit', { board });
    } catch (error) {
        next(error);
    }
}

const postEditBoard = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const { title, content } = req.body;
        await comService.updateBoard(boardId, title, content);
        res.redirect(`/community/list/${boardId}`);
    } catch (error) {
        next(error);
    }
}

const putComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        await comService.updateComment(commentId, content);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

const deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        await comService.deleteComment(commentId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

const deleteBoard = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        await comService.deleteBoard(boardId);
        res.redirect('/community/list');
    } catch (error) {
        next(error);
    }
}

module.exports = { getCommunity, getListAPI, postBoardLike, getWrite, postWrite, getDetail, postComment,putComment,deleteComment,postEditBoard, postEditBoard, deleteBoard, getEditBoard };
