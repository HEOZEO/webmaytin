const express = require('express');
const router = express.Router();
const {
  getCouponUsages,
  getCouponUsage,
  getUserCouponUsages,
  getCouponUsageStats
} = require('../controllers/couponUsageController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'staff'), getCouponUsages);
router.get('/:id', protect, authorize('admin', 'staff'), getCouponUsage);
router.get('/user/:userId', protect, authorize('admin', 'staff'), getUserCouponUsages);
router.get('/coupon/:couponId/stats', protect, authorize('admin', 'staff'), getCouponUsageStats);

module.exports = router;