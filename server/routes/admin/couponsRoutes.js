const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { requireAdmin, auditLog } = require('../../middleware/adminAuth');
const adminCouponsController = require('../../controllers/adminCouponsController');

// All routes require admin authentication
router.use(protect, requireAdmin);

// Coupons management
router.get('/', adminCouponsController.getCoupons);
router.get('/stats', adminCouponsController.getCouponStats);
router.get('/:id', adminCouponsController.getCouponDetails);
router.post('/', auditLog('CREATE_COUPON'), adminCouponsController.createCoupon);
router.put('/:id', auditLog('UPDATE_COUPON'), adminCouponsController.updateCoupon);
router.delete('/:id', auditLog('DELETE_COUPON'), adminCouponsController.deleteCoupon);
router.put('/:id/toggle', auditLog('TOGGLE_COUPON_STATUS'), adminCouponsController.toggleCouponStatus);

module.exports = router;
