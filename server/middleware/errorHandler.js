const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    code: err.code,
    detail: err.detail,
    stack: err.stack ? err.stack.split('\n')[0] : 'no stack'
  });

  let error = { ...err };
  error.message = err.message;

  // Multer file size exceeded
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'Kích thước file quá lớn (tối đa 5MB)';
    return res.status(413).json({
      success: false,
      message: error.message
    });
  }

  // Multer wrong file type (from fileFilter cb(new Error(...)))
  if (err.message && (err.message.includes('only accepts') || err.message.includes('Chỉ chấp nhận'))) {
    return res.status(415).json({
      success: false,
      message: err.message
    });
  }

  // Multer unexpected field (when field name doesn't match 'bill_image')
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'File upload không hợp lệ (tên field không đúng)';
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Multer missing field name error
  if (err.message && err.message.includes('Field name missing')) {
    return res.status(400).json({
      success: false,
      message: 'Tên field upload không hợp lệ'
    });
  }

  // Catch any multer-related error with HTTP-like message
  if (err.message && (err.message.includes('Multipart') || err.message.includes('multipart'))) {
    error.message = 'Lỗi upload multipart. Vui lòng thử lại.';
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // PostgreSQL unique constraint error (23505)
  if (err.code === '23505') {
    error.message = 'Dữ liệu đã tồn tại';
    return res.status(409).json({ 
      success: false, 
      message: error.message 
    });
  }

  // PostgreSQL foreign key constraint error (23503)
  if (err.code === '23503') {
    error.message = 'Tham chiếu không hợp lệ';
    return res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }

  // PostgreSQL check constraint error (23514)
  if (err.code === '23514') {
    error.message = 'Giá trị không hợp lệ';
    return res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }

  // Query timeout or connection error
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    error.message = 'Lỗi kết nối cơ sở dữ liệu';
    return res.status(503).json({ 
      success: false, 
      message: error.message 
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    // Only leak detailed message in development; production shows generic
    message: process.env.NODE_ENV === 'development'
      ? (error.message || 'Lỗi server')
      : 'Lỗi server'
  });

  // Log full stack only in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error('[STACK]', err.stack);
  }
};

module.exports = errorHandler;
