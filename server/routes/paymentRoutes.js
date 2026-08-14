const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/auth');
const {
  getQRInfo,
  uploadBill,
  getMyRequests,
  resendBill
} = require('../controllers/paymentController');

// Customer routes
router.get('/qr', getQRInfo);
router.post('/upload-bill', protect, upload.single('bill_image'), uploadBill);
router.get('/my-requests', protect, getMyRequests);
router.post('/resend-bill', protect, upload.single('bill_image'), resendBill);

module.exports = router;
