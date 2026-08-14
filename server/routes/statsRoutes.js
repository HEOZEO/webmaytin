const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getRevenue,
  getInventory,
  getBestSellers
} = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin'), getDashboard);
router.get('/revenue', protect, authorize('admin'), getRevenue);
router.get('/inventory', protect, authorize('admin', 'staff'), getInventory);
router.get('/best-sellers', protect, authorize('admin'), getBestSellers);

module.exports = router;
