const express = require('express');
const router = express.Router();
const { protect, adminOnly, staff, hasPermission } = require('../../middleware/auth');
const adminProductController = require('../../controllers/adminProductController');

// Staff + Admin đều truy cập được. Quyền chi tiết do admin cấu hình qua permissions.
router.use(protect);
router.use(staff);

// Products CRUD — kiểm tra quyền chi tiết
router.get('/', hasPermission('products.view'), adminProductController.getProducts);
router.get('/low-stock', hasPermission('inventory.view'), adminProductController.getLowStockProducts);
router.get('/inventory-history', hasPermission('inventory.view'), adminProductController.getInventoryHistory);
router.get('/:id', hasPermission('products.view'), adminProductController.getProduct);

// Staff có thể tạo + sửa nếu được cấp quyền
router.post('/', hasPermission('products.create'), adminProductController.createProduct);
router.put('/:id', hasPermission('products.update'), adminProductController.updateProduct);
router.post('/bulk-stock', hasPermission('products.bulk_stock'), adminProductController.bulkUpdateStock);
router.post('/bulk/update-stock', hasPermission('products.bulk_stock'), adminProductController.bulkUpdateStock);

// Restore / delete — admin-only
router.put('/:id/restore', adminOnly, adminProductController.restoreProduct);
router.delete('/:id', adminOnly, adminProductController.deleteProduct);

// Inventory
router.get('/:productId/inventory', hasPermission('inventory.view'), adminProductController.getInventoryHistory);

module.exports = router;