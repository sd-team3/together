const express = require('express');
const router = express.Router();
const notiController = require('../controllers/notiController');
const { apiLoginValidation } = require('../middlewares/requestValidation');

router.use(apiLoginValidation);
router.use('/web-push', require('./webPushRouter'));

router.get('/unread', notiController.getUnread);
router.get('/read', notiController.getRead);
router.patch('/:notiId/read', notiController.patchRead);
router.patch('/read-all', notiController.patchReadAll);
router.delete('/:notiId/delete', notiController.deleteNoti);

module.exports = router;
