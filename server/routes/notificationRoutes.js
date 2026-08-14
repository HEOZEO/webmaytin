const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUserNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcastNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// Admin routes
router.get('/', protect, authorize('admin', 'staff'), getNotifications);
router.post('/', protect, authorize('admin'), createNotification);
router.post('/broadcast', protect, authorize('admin'), broadcastNotification);

// User routes
router.get('/me', protect, getUserNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;