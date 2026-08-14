const express = require('express');
const router = express.Router();
const { protect, hasPermission } = require('../../middleware/auth');
const { requireStaff, auditLog } = require('../../middleware/adminAuth');
const adminUsersController = require('../../controllers/adminUsersController');

// All routes require staff or admin authentication (staff can view + lock/unlock customers)
router.use(protect, requireStaff);

// Helper: chỉ admin mới được phép thực hiện action này
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này'
    });
  }
  next();
};

// Users management
router.get('/permissions/default', adminOnly, adminUsersController.getDefaultPermissions);
router.get('/', hasPermission('users.view'), adminUsersController.getUsers);
router.post('/', adminOnly, auditLog('CREATE_USER'), adminUsersController.createUser);
router.get('/stats', hasPermission('users.view'), adminUsersController.getUserStats);
router.get('/:id', hasPermission('users.view'), adminUsersController.getUserDetails);
router.put('/:id/info', adminOnly, auditLog('UPDATE_USER_INFO'), adminUsersController.updateUserInfo);
router.put('/:id/role', adminOnly, auditLog('UPDATE_USER_ROLE'), adminUsersController.updateUserRole);
router.put('/:id/status', hasPermission('users.lock_customer'), auditLog('TOGGLE_USER_STATUS'), adminUsersController.toggleUserStatus);
router.delete('/:id', adminOnly, auditLog('DELETE_USER'), adminUsersController.deleteUser);
router.get('/:id/orders', hasPermission('users.view'), adminUsersController.getUserOrderHistory);
router.get('/:id/lockout-status', hasPermission('users.view'), adminUsersController.getUserLockoutStatus);
router.post('/:userId/unlock', hasPermission('users.lock_customer'), auditLog('UNLOCK_USER_ACCOUNT'), adminUsersController.unlockUserAccount);

// Cập nhật permissions cho staff — admin only
router.get('/:id/permissions', adminOnly, adminUsersController.getUserPermissions);
router.put('/:id/permissions', adminOnly, auditLog('UPDATE_USER_PERMISSIONS'), adminUsersController.updateUserPermissions);

module.exports = router;