const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/logController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getLogs);

module.exports = router;
