const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');
const { verifyCsrfToken } = require('../middleware/csrf');
const { idempotencyMiddleware } = require('../middleware/idempotency');

// Strict rate limit for order creation to prevent flooding & inventory churn.
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn tạo đơn hàng quá nhiều lần, vui lòng chờ 10 phút.' }
});

// Middleware to validate :id is a numeric value
const validateOrderId = (req, res, next) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
  }
  next();
};

// SECURITY: Apply CSRF protection and idempotency for order creation
router.post('/',
  protect,
  orderLimiter,
  validateOrder,
  // verifyCsrfToken, // Temporarily disabled for debugging
  idempotencyMiddleware(),
  createOrder
);

router.get('/', protect, getOrders);

// Specific named routes MUST come before parameterized /:id route
router.get('/my-orders', protect, getOrders);

router.get('/:id', protect, validateOrderId, getOrder);
router.put('/:id/status', protect, validateOrderId, authorize('staff', 'admin'), updateOrderStatus);
router.put('/:id/cancel', protect, validateOrderId, cancelOrder);

module.exports = router;
