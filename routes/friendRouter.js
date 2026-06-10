const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { loginValidation } = require('../middlewares/crewMiddleware');

router.get('/', loginValidation, friendController.getFriendList);
router.delete('/:friendId', loginValidation, friendController.removeFriend);
router.patch('/:friendId/favorite', loginValidation, friendController.toggleFavorite);

module.exports = router;