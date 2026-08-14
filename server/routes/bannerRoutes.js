const express = require('express');
const router = express.Router();
const {
  getBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  updateBannerOrder
} = require('../controllers/bannerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getBanners);
router.get('/:id', getBanner);
router.post('/', protect, authorize('admin'), createBanner);
router.put('/order', protect, authorize('admin'), updateBannerOrder);
router.put('/:id', protect, authorize('admin'), updateBanner);
router.delete('/:id', protect, authorize('admin'), deleteBanner);

module.exports = router;