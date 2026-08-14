const express = require('express');
const router = express.Router();
const {
  getProductImages,
  createProductImage,
  updateProductImage,
  deleteProductImage
} = require('../controllers/productImageController');
const { protect, authorize } = require('../middleware/auth');

router.get('/:productId', getProductImages);
router.post('/:productId', protect, authorize('admin'), createProductImage);
router.put('/:id', protect, authorize('admin'), updateProductImage);
router.delete('/:id', protect, authorize('admin'), deleteProductImage);

module.exports = router;