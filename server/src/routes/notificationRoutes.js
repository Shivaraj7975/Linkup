const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotif,
  clearAllNotifs,
} = require('../controllers/notificationController');

router.get('/', authenticateToken, getNotifications);
router.put('/read-all', authenticateToken, markAllRead);
router.put('/:id/read', authenticateToken, markRead);
router.delete('/clear-all', authenticateToken, clearAllNotifs);
router.delete('/:id', authenticateToken, deleteNotif);

module.exports = router;
