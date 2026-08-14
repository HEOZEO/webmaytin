const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { requireAdmin, auditLog } = require('../../middleware/adminAuth');
const adminSettingsController = require('../../controllers/adminSettingsController');

// All routes require admin authentication
router.use(protect, requireAdmin);

// Settings management
router.get('/', adminSettingsController.getSettings);
router.get('/key/:key', adminSettingsController.getSetting);
router.put('/key/:key', auditLog('UPDATE_SETTING'), adminSettingsController.updateSetting);
router.put('/bulk/update', auditLog('BULK_UPDATE_SETTINGS'), adminSettingsController.bulkUpdateSettings);

// Store info
router.get('/store/info', adminSettingsController.getStoreInfo);
router.put('/store/info', auditLog('UPDATE_STORE_INFO'), adminSettingsController.updateStoreInfo);

// Notification settings
router.get('/notifications/settings', adminSettingsController.getNotificationSettings);
router.put('/notifications/settings', auditLog('UPDATE_NOTIFICATION_SETTINGS'), adminSettingsController.updateNotificationSettings);

module.exports = router;
