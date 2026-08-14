const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { requireStaff, auditLog } = require('../../middleware/adminAuth');
const adminOrdersController = require('../../controllers/adminOrdersController');

// All routes require staff authentication
router.use(protect, requireStaff);

// Staff can view orders and update status
router.get('/', adminOrdersController.getOrders);
router.get('/recent', adminOrdersController.getRecentOrders);
router.get('/:id', adminOrdersController.getOrderDetails);

// Staff can update order status (but not cancel - admin only)
router.put('/:id/status', auditLog('UPDATE_ORDER_STATUS'), adminOrdersController.updateOrderStatus);

module.exports = router;
