const express = require('express');
const router = express.Router();
const {
  getShippingMethods,
  getShippingMethod,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod
} = require('../controllers/shippingMethodController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getShippingMethods);
router.get('/:id', getShippingMethod);
router.post('/', protect, authorize('admin'), createShippingMethod);
router.put('/:id', protect, authorize('admin'), updateShippingMethod);
router.delete('/:id', protect, authorize('admin'), deleteShippingMethod);

module.exports = router;