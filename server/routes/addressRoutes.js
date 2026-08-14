const express = require('express');
const router = express.Router();
const { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } = require('../controllers/addressController');
const { protect } = require('../middleware/auth');
const { validateAddress } = require('../middleware/validation');

router.get('/', protect, getAddresses);
router.post('/', protect, validateAddress, createAddress);
router.put('/:id', protect, validateAddress, updateAddress);
router.delete('/:id', protect, deleteAddress);
router.put('/:id/set-default', protect, setDefaultAddress);

module.exports = router;
