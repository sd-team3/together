const express = require('express');
const router = express.Router();
const notiService = require('../services/notiService');

router.get('/unread', async (req, res)=>{
    try {
        const userId = req.user._id;
        const unreadNoti = await notiService.findUnReadNotiByUserId(userId);
        res.json(unreadNoti);
    } catch (error) {
        res.status(500).json({ message: 'notiRouter' });
    }
});

router.get('/read', async (req, res)=>{
    try {
        const userId = req.user._id;
        const unreadNoti = await notiService.findReadNotiByUserId(userId);
        res.json(unreadNoti);
    } catch (error) {
        res.status(500).json({ message: 'notiRouter' });
    }
});

router.patch('/:notiId/read', async (req, res)=>{
    try {
        const { notiId } = req.params;
        await notiService.readNotiByNotiId(notiId);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'notiRouter' });
    }
});

router.patch('/read-all', async (req, res)=>{
    try {
        await notiService.readAllNotiByUserId(req.user._id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'notiRouter' });
    }
});

router.delete('/:notiId/delete', async (req, res) => {
    try {
        const { notiId } = req.params;
        await notiService.deleteNotiByNotiId(notiId);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'notiRouter' });
    }
});

module.exports = router;