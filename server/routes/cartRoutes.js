const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  updateCartItemByProduct,
  removeFromCart,
  removeFromCartByProduct,
  clearCart,
  mergeCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { validateAddToCart, validateUpdateCart } = require('../middleware/validation');

router.get('/', protect, getCart);
router.post('/', protect, validateAddToCart, addToCart);
router.put('/:itemId', protect, validateUpdateCart, updateCartItem);
router.put('/product/:productId', protect, validateUpdateCart, updateCartItemByProduct);
router.delete('/:itemId', protect, removeFromCart);
router.delete('/product/:productId', protect, removeFromCartByProduct);
router.delete('/', protect, clearCart);
router.post('/merge', protect, mergeCart);

module.exports = router;
