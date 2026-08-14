const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  compareProducts,
  searchProducts
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');

router.get('/', getProducts);
router.get('/search', searchProducts); // Autocomplete search - must be before /:id
router.get('/compare', compareProducts);
router.get('/suggestions', searchProducts); // Alias for /search
router.get('/:id', getProduct);
router.post('/', protect, authorize('admin'), validateProduct, createProduct);
router.put('/:id', protect, authorize('admin'), validateProduct, updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
