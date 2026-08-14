const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getCoupons,
  validateCoupon,
  validateCouponForCheckout,
  getAvailableCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus
} = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');

// Strict rate limit for coupon validation to prevent brute force / abuse
const couponLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã thử mã giảm giá quá nhiều lần, vui lòng chờ 5 phút.' }
});

router.get('/available', getAvailableCoupons);
router.post('/validate', couponLimiter, validateCouponForCheckout);
router.get('/', protect, adminOnly, getCoupons);
router.post('/', protect, adminOnly, createCoupon);
router.put('/:id', protect, adminOnly, updateCoupon);
router.delete('/:id', protect, adminOnly, deleteCoupon);
router.patch('/:id/toggle', protect, adminOnly, toggleCouponStatus);

module.exports = router;
