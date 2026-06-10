const mongosse = require('mongoose');
const comService = require('../../services/community/comService');

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

module.exports = { getCommunity, getListAPI, postBoardLike };