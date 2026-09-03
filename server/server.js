const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

// Validate required env vars at startup
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`� FATAL: Missing required environment variable: ${key}`);
    console.error(`Please set ${key} in server/.env file`);
    process.exit(1);
  }
}

// SECURITY: reject the placeholder/default JWT_SECRET in production.
const PLACEHOLDER_SECRETS = [
  'your_super_secret_jwt_key_change_this_in_production',
  'your_super_secret_jwt_key_here_change_in_production_laptop_store_2024',
  'CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_64_BYTES'
];
if (process.env.NODE_ENV === 'production' &&
    (PLACEHOLDER_SECRETS.includes(process.env.JWT_SECRET) ||
     (process.env.JWT_SECRET || '').length < 32)) {
  console.error('❌ FATAL: JWT_SECRET must be a long random string (>= 32 chars) in production.');
  process.exit(1);
}
if ((process.env.JWT_SECRET || '').length < 16) {
  console.warn('⚠️  WARNING: JWT_SECRET is too short. Use at least 32 random characters.');
}

// Import database
const { pool, connectDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const couponRoutes = require('./routes/couponRoutes');
const userRoutes = require('./routes/userRoutes');
const statsRoutes = require('./routes/statsRoutes');
const logRoutes = require('./routes/logRoutes');
const addressRoutes = require('./routes/addressRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const productImageRoutes = require('./routes/productImageRoutes');
const productSpecRoutes = require('./routes/productSpecRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const shippingMethodRoutes = require('./routes/shippingMethodRoutes');
const couponUsageRoutes = require('./routes/couponUsageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingRoutes = require('./routes/settingRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const contactRoutes = require('./routes/contactRoutes');
const locationRoutes = require('./routes/locationRoutes');

// Admin routes
const adminStatsRoutes = require('./routes/admin/statsRoutes');
const adminOrdersRoutes = require('./routes/admin/ordersRoutes');
const adminProductsRoutes = require('./routes/admin/productsRoutes');
const adminUsersRoutes = require('./routes/admin/usersRoutes');
const adminCouponsRoutes = require('./routes/admin/couponsRoutes');
const adminSettingsRoutes = require('./routes/admin/settingsRoutes');
const adminAnalyticsRoutes = require('./routes/admin/analyticsRoutes');
const adminNotificationsRoutes = require('./routes/admin/notificationsRoutes');
const adminPaymentRoutes = require('./routes/admin/paymentRoutes');
const adminReviewsRoutes = require('./routes/admin/reviewsRoutes');

// Staff routes
const staffOrdersRoutes = require('./routes/staff/ordersRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { verifyCsrfToken } = require('./middleware/csrf');
const { idempotencyMiddleware } = require('./middleware/idempotency');
const { startAllJobs } = require('./jobs/scheduler');

const app = express();

// Rate limiting - Giảm giới hạn xuống còn development mode
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 1000, // 1000 requests cho dev, 1000 cho production (tăng lên để test)
  message: {
    success: false,
    message: 'Quá nhiều requests, vui lòng thử lại sau 15 phút'
  },
  skip: (req) => {
    // Skip rate limit cho health check và test-db
    return req.path === '/api/health' || req.path === '/api/test-db';
  }
});

// Strict rate limit cho các endpoint nhạy cảm (login, order create, contact)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 50, // Nới lỏng lên 100 để test thoải mái
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều thao tác, vui lòng thử lại sau 15 phút' }
});

// Middlewares
// Security headers via helmet
// CSP is configured for production to prevent XSS attacks
app.use(helmet({
  // Content Security Policy - strict whitelist for production
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Enable CORS - whitelist từ env, fallback cho dev
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép request không có origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    // Trong development, cho phép tất cả
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // Trong production, chỉ cho phép whitelist
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin} not allowed`));
  },
  credentials: true,
  // Expose CSRF header so frontend can read it from response (cookie is httpOnly)
  // Otherwise browser refuses to expose x-csrf-token to JS → CSRF token never updates client-side
  exposedHeaders: ['x-csrf-token']
}));

// Security headers - prevent XSS, clickjacking, etc.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Static images serving (must be BEFORE catch-all 404)
const path = require('path');
const fs = require('fs');
const IMAGES_DIR = path.resolve(__dirname, '..', 'client', 'public', 'images');
if (fs.existsSync(IMAGES_DIR)) {
  app.use('/images', express.static(IMAGES_DIR, {
    // Short cache + ETag, so updates are picked up quickly without forcing
    // every request to revalidate. Browser will still revalidate on reload.
    maxAge: '5m',
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      // Allow browsers to revalidate when file changes (instead of holding 1d cache).
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    }
  }));
  console.log(`📸 Static images served from: ${IMAGES_DIR}`);
}

// Serve uploaded bill images — kèm CORS headers để chắc chắn browser cho load ảnh
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (fs.existsSync(UPLOADS_DIR)) {
  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    next();
  }, express.static(UPLOADS_DIR, {
    // Set headers per file to ensure correct MIME detection
    setHeaders: (res, filePath) => {
      // Force correct Content-Type based on extension (fallback if mime detection fails)
      if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
      else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
      else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
    }
  }));
  console.log(`📁 Uploads directory served from: ${UPLOADS_DIR}`);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/product-images', productImageRoutes);
app.use('/api/product-specs', productSpecRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipping-methods', shippingMethodRoutes);
app.use('/api/coupon-usage', couponUsageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/banners', bannerRoutes);

// Admin routes
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/products', adminProductsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/coupons', adminCouponsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/reviews', adminReviewsRoutes);

// Staff routes
app.use('/api/staff/orders', staffOrdersRoutes);

// Contact routes
app.use('/api/contact', contactRoutes);
app.use('/api/locations', locationRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Laptop Store API is running!',
    timestamp: new Date().toISOString()
  });
});

// Polling notification endpoint (lightweight - optional)
app.get('/api/notifications/poll', strictLimiter, (req, res) => {
  res.json({
    success: true,
    data: {
      notifications: [],
      timestamp: new Date().toISOString()
    }
  });
});

// Database test route
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Laptop Store API',
    version: '1.0.0'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại'
  });
});

const PORT = process.env.PORT || 5000;

// SECURITY: log warning if running with placeholder secrets even in dev
if (PLACEHOLDER_SECRETS.includes(process.env.JWT_SECRET)) {
  console.warn('⚠️  JWT_SECRET is using the placeholder value. Change it before deploying.');
}
if (process.env.EMAIL_PASS &&
    process.env.EMAIL_PASS.length > 0 &&
    process.env.EMAIL_PASS !== 'your-app-specific-password' &&
    process.env.EMAIL_USER !== 'your-email@example.com') {
  console.log('📧 Email configured for:', process.env.EMAIL_USER);
} else {
  console.warn('�️  Email is not fully configured. Order notifications will be skipped.');
}

// Helper: kill process using a specific port (Windows)
const killPortProcess = (port) => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, (err, stdout) => {
      if (err || !stdout.trim()) {
        // No process found listening, try killing all node processes as fallback
        exec('taskkill /F /IM node.exe /FI "PID ne ' + process.pid + '"', () => {
          setTimeout(resolve, 1500);
        });
        return;
      }
      // Extract PIDs from netstat output
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== String(process.pid) && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }
      if (pids.size === 0) {
        setTimeout(resolve, 1000);
        return;
      }
      let killed = 0;
      for (const pid of pids) {
        exec(`taskkill /F /PID ${pid}`, (killErr) => {
          killed++;
          if (!killErr) {
            console.log(`🔪 Killed process PID ${pid} on port ${port}`);
          }
          if (killed === pids.size) {
            setTimeout(resolve, 1500);
          }
        });
      }
    });
  });
};

// Start server with database connection check and auto-retry on EADDRINUSE
const startServer = async (retryCount = 0) => {
  const MAX_RETRIES = 3;

  try {
    console.log('🔧 Starting Laptop Store Server...');
    console.log('📝 Environment:', process.env.NODE_ENV || 'development');
    console.log('📡 Connecting to database...');
    
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('✅ Server started successfully!');
      console.log('═══════════════════════════════════════');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  Database test: http://localhost:${PORT}/api/test-db`);
      console.log('═══════════════════════════════════════');
      console.log('');

      // Start background jobs (email queue, payment monitoring, etc.)
      if (process.env.ENABLE_BACKGROUND_JOBS !== 'false') {
        startAllJobs();
      } else {
        console.log('⏭️  Background jobs disabled (ENABLE_BACKGROUND_JOBS=false)');
      }
    });

    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        if (retryCount >= MAX_RETRIES) {
          console.error(`❌ Port ${PORT} vẫn bị chiếm sau ${MAX_RETRIES} lần thử. Thoát...`);
          console.error(`💡 Hãy chạy: taskkill /F /IM node.exe rồi thử lại.`);
          process.exit(1);
        }
        console.warn(`⚠️  Port ${PORT} đang bị chiếm. Đang tự động giải phóng... (lần thử ${retryCount + 1}/${MAX_RETRIES})`);
        await killPortProcess(PORT);
        console.log(`🔄 Thử khởi động lại server...`);
        startServer(retryCount + 1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n📛 Received ${signal}. Shutting down gracefully...`);
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (err) {
    console.error('❌ Error closing pool:', err);
  }
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();