const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, isInWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getWishlist);
router.post('/', protect, addToWishlist);
router.delete('/:product_id', protect, removeFromWishlist);
router.get('/:product_id', protect, isInWishlist);

module.exports = router;
