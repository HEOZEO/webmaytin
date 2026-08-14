const express = require('express');
const router = express.Router();
const upload = require('../../middleware/uploadMiddleware');
const { protect, authorize } = require('../../middleware/auth');
const {
  getPaymentSettings,
  updatePaymentSettings,
  getPaymentRequests,
  getPaymentRequest,
  approvePaymentRequest,
  rejectPaymentRequest
} = require('../../controllers/paymentController');

// All routes require admin or staff
router.use(protect, authorize('admin', 'staff'));

router.get('/settings', getPaymentSettings);
router.put('/settings', upload.single('qr_image'), updatePaymentSettings);
router.get('/requests', getPaymentRequests);
router.get('/requests/:id', getPaymentRequest);
router.put('/requests/:id/approve', approvePaymentRequest);
router.put('/requests/:id/reject', rejectPaymentRequest);

module.exports = router;
