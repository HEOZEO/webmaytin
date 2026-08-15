const express = require('express');
const router = express.Router();
const adminReviewsController = require('../../controllers/adminReviewsController');
const { protect, admin } = require('../../middleware/auth');

// Tất cả route quản lý đánh giá đều yêu cầu quyền admin
router.use(protect, admin);

// Lấy danh sách đánh giá
router.get('/', adminReviewsController.getAllReviews);

// Ẩn/Hiện đánh giá
router.put('/:id/toggle-visibility', adminReviewsController.toggleVisibility);

// Xoá đánh giá
router.delete('/:id', adminReviewsController.deleteReview);

module.exports = router;
