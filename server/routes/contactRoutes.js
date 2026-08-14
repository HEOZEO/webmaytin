const express = require('express');
const router = express.Router();
const contactMessagesController = require('../controllers/contactMessagesController');
const { protect: authenticateToken, admin: isAdmin, staff } = require('../middleware/auth');

// Public endpoint - create contact message
router.post('/', contactMessagesController.createMessage);

// Customer endpoint - get own contact messages & admin replies
router.get('/my-messages', authenticateToken, contactMessagesController.getMyMessages);

// Admin + Staff endpoints (staff được xem và xử lý liên hệ)
router.get('/', authenticateToken, staff, contactMessagesController.getMessages);
router.get('/:id', authenticateToken, staff, contactMessagesController.getMessage);
router.patch('/:id/read', authenticateToken, staff, contactMessagesController.markAsRead);
router.patch('/:id/replied', authenticateToken, staff, contactMessagesController.markAsReplied);
router.post('/:id/reply', authenticateToken, staff, contactMessagesController.replyToMessage);
// Chỉ admin được xoá
router.delete('/:id', authenticateToken, isAdmin, contactMessagesController.deleteMessage);

module.exports = router;