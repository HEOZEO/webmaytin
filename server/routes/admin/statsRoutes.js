const express = require('express');
const router = express.Router();
const { protect, staff } = require('../../middleware/auth');
const {
  getDashboardStats,
  getTopProducts,
  getRecentOrders,
  getRevenueWeekly,
  getRevenueMonthly,
  getRevenueQuarterly,
  getRevenueByGroup,
  getAlerts
} = require('../../controllers/adminStatsController');

// Staff + Admin đều xem được dashboard stats
router.use(protect, staff);

router.get('/dashboard', getDashboardStats);
router.get('/top-products', getTopProducts);
router.get('/recent-orders', getRecentOrders);
router.get('/recent', getRecentOrders);
router.get('/revenue', getRevenueByGroup);
router.get('/revenue-weekly', getRevenueWeekly);
router.get('/revenue-monthly', getRevenueMonthly);
router.get('/revenue-quarterly', getRevenueQuarterly);
router.get('/alerts', getAlerts);

module.exports = router;