const express = require('express');
const router = express.Router();
const { protect, staff, adminOnly, hasPermission } = require('../../middleware/auth');
const { auditLog } = require('../../middleware/adminAuth');
const adminOrdersController = require('../../controllers/adminOrdersController');
const { exportOrders } = require('../../controllers/adminExportController');

// Staff + Admin đều truy cập được. Quyền chi tiết qua permissions.
router.use(protect, staff);

router.get('/', hasPermission('orders.view'), adminOrdersController.getOrders);
router.post('/', hasPermission('orders.create'), auditLog('CREATE_ORDER'), adminOrdersController.createOrder);
router.get('/recent', hasPermission('orders.view'), adminOrdersController.getRecentOrders);
router.get('/stats', hasPermission('orders.view'), adminOrdersController.getOrderStats);
router.get('/export', adminOnly, auditLog('EXPORT_ORDERS'), exportOrders);
router.get('/:id', hasPermission('orders.view'), adminOrdersController.getOrderDetails);
router.put('/:id/status', hasPermission('orders.update_status'), auditLog('UPDATE_ORDER_STATUS'), adminOrdersController.updateOrderStatus);
router.put('/:id/cancel', hasPermission('orders.cancel'), auditLog('CANCEL_ORDER'), adminOrdersController.cancelOrder);
router.put('/:id/approve-cod', hasPermission('orders.update_status'), auditLog('APPROVE_COD'), adminOrdersController.approveCOD);

// Xoá đơn — admin-only
router.delete('/:id', adminOnly, auditLog('DELETE_ORDER'), adminOrdersController.deleteOrder);

module.exports = router;