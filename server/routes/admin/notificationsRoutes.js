const express = require('express');
const router = express.Router();
const adminNotificationsController = require('../../controllers/adminNotificationsController');
const { protect: authenticateToken, staff } = require('../../middleware/auth');

// Staff + Admin cùng xem được notifications
router.use(authenticateToken, staff);

router.get('/', adminNotificationsController.getNotifications);
router.post('/', adminNotificationsController.createNotification);
router.patch('/:id/read', adminNotificationsController.markAsRead);
router.patch('/mark-all-read', adminNotificationsController.markAllAsRead);
router.delete('/:id', adminNotificationsController.deleteNotification);

module.exports = router;