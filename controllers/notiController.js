const notiService = require('../services/notiService');

function respondError(res, error) {
    const status = [400, 404].includes(error.status) ? error.status : 500;
    res.status(status).json({ message: status === 500 ? '알림을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' : error.message });
}

const getUnread = async (req, res) => {
    try {
        const notifications = await notiService.findUnReadNotiByUserId(req.user._id);
        res.json(notifications);
    } catch (error) { respondError(res, error); }
};

const getRead = async (req, res) => {
    try {
        const notifications = await notiService.findReadNotiByUserId(req.user._id);
        res.json(notifications);
    } catch (error) { respondError(res, error); }
};

const patchRead = async (req, res) => {
    try {
        await notiService.readNotiByNotiId(req.params.notiId, req.user._id);
        res.status(200).json({ success: true });
    } catch (error) { respondError(res, error); }
};

const patchReadAll = async (req, res) => {
    try {
        await notiService.readAllNotiByUserId(req.user._id);
        res.status(200).json({ success: true });
    } catch (error) { respondError(res, error); }
};

const deleteNoti = async (req, res) => {
    try {
        await notiService.deleteNotiByNotiId(req.params.notiId, req.user._id);
        res.status(200).json({ success: true });
    } catch (error) { respondError(res, error); }
};

module.exports = { getUnread, getRead, patchRead, patchReadAll, deleteNoti };
