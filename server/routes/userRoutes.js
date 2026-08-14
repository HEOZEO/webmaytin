const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUserRole,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'staff'), getUsers);
router.get('/:id', protect, authorize('admin', 'staff'), getUser);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
