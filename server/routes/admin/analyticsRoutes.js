const express = require('express');
const router = express.Router();
const { protect, staff } = require('../../middleware/auth');
const adminAnalyticsController = require('../../controllers/adminAnalyticsController');

// Staff + Admin cùng xem được analytics
router.use(protect, staff);

router.get('/revenue', adminAnalyticsController.getRevenueByDateRange);
router.get('/top-products', adminAnalyticsController.getTopSellingProducts);
router.get('/order-status', adminAnalyticsController.getOrderStatusDistribution);
router.get('/category-sales', adminAnalyticsController.getCategorySales);
router.get('/brand-sales', adminAnalyticsController.getBrandSales);
router.get('/customer-acquisition', adminAnalyticsController.getCustomerAcquisition);
router.get('/summary', adminAnalyticsController.getSummaryStats);

module.exports = router;