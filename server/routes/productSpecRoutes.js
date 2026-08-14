const express = require('express');
const router = express.Router();
const {
  getProductSpecs,
  createProductSpec,
  updateProductSpec,
  deleteProductSpec,
  bulkCreateProductSpecs
} = require('../controllers/productSpecController');
const { protect, authorize } = require('../middleware/auth');

router.get('/:productId', getProductSpecs);
router.post('/:productId', protect, authorize('admin'), createProductSpec);
router.post('/:productId/bulk', protect, authorize('admin'), bulkCreateProductSpecs);
router.put('/:id', protect, authorize('admin'), updateProductSpec);
router.delete('/:id', protect, authorize('admin'), deleteProductSpec);

module.exports = router;