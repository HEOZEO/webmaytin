const express = require('express');
const router = express.Router();
const {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategoryVisibility
} = require('../controllers/categoryController');
const { protect, hasPermission } = require('../middleware/auth');

router.get('/', getCategories);
router.get('/admin', protect, hasPermission('categories.view'), getAdminCategories);
router.post('/', protect, hasPermission('categories.create'), createCategory);
router.put('/:id', protect, hasPermission('categories.update'), updateCategory);
router.put('/:id/toggle-visibility', protect, hasPermission('categories.update'), toggleCategoryVisibility);

module.exports = router;
