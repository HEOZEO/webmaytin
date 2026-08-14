const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  bulkUpdateSettings
} = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getSettings);
router.get('/:key', getSetting);
router.post('/', protect, authorize('admin'), createSetting);
router.put('/bulk', protect, authorize('admin'), bulkUpdateSettings);
router.put('/:key', protect, authorize('admin'), updateSetting);
router.delete('/:key', protect, authorize('admin'), deleteSetting);

module.exports = router;