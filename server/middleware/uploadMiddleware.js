const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/bills'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Dùng extension theo mimetype (đáng tin cậy) thay vì filename gốc của client
    // Tránh trường hợp client upload "bill" (không có ext) → file không extension
    // → browser không detect MIME → broken image
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/jpg':  '.jpg',
      'image/png':  '.png',
      'image/webp': '.webp',
      'image/gif':  '.gif'
    };
    const ext = mimeToExt[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `bill-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh: JPG, PNG, WEBP, GIF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

module.exports = upload;
