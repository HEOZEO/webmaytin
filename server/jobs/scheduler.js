/**
 * Background Jobs Scheduler
 * Handles:
 * 1. Email Outbox Worker - Sends queued emails
 * 2. Pending Payment Auto-Cancel - Cancels unpaid bank transfer orders after 48h
 * 3. Idempotency Keys Cleanup - Removes expired keys
 * 4. Stock Notifications - Sends notifications when back in stock
 */

const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');

// Configuration
const EMAIL_BATCH_SIZE = 10;
const EMAIL_RETRY_DELAY_MS = 30000; // 30 seconds between batches
const PAYMENT_CANCEL_HOURS = 48;
const PAYMENT_REMINDER_HOURS = 24;

let isRunning = false;
let emailWorkerInterval = null;
let paymentCheckInterval = null;

/**
 * ===== EMAIL OUTBOX WORKER =====
 * Processes queued emails from the outbox table
 */

const processEmailBatch = async () => {
  if (isRunning) return;
  isRunning = true;

  const client = await pool.connect();
  try {
    // Get pending emails that haven't exceeded max attempts
    const result = await client.query(`
      SELECT id, to_address, subject, body_html, body_text, attempts, max_attempts,
             last_attempt_at, error_message, related_order_id
      FROM email_outbox
      WHERE status = 'pending'
        AND attempts < max_attempts
        AND (last_attempt_at IS NULL OR last_attempt_at < NOW() - INTERVAL '5 minutes')
      ORDER BY created_at ASC
      LIMIT $1
    `, [EMAIL_BATCH_SIZE]);

    if (result.rows.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`📧 Processing ${result.rows.length} emails from outbox...`);

    for (const email of result.rows) {
      try {
        // Attempt to send email
        await sendEmail({
          to: email.to_address,
          subject: email.subject,
          html: email.body_html || email.body_text || ''
        });

        // Success - update status
        await client.query(`
          UPDATE email_outbox
          SET status = 'sent',
              sent_at = NOW(),
              updated_at = NOW(),
              last_attempt_at = NOW()
          WHERE id = $1
        `, [email.id]);

        console.log(`   ✅ Sent email to ${email.to_address}: "${email.subject}"`);

      } catch (error) {
        // Failure - increment attempts and record error
        const newAttempts = email.attempts + 1;
        const isFinalAttempt = newAttempts >= email.max_attempts;

        await client.query(`
          UPDATE email_outbox
          SET attempts = $2,
              last_attempt_at = NOW(),
              error_message = $3,
              status = $4,
              updated_at = NOW()
          WHERE id = $1
        `, [
          email.id,
          newAttempts,
          error.message,
          isFinalAttempt ? 'failed' : 'pending'
        ]);

        console.error(`   ❌ Failed to send email to ${email.to_address}: ${error.message}`);

        // For critical emails (order confirmations), alert admin
        if (email.related_order_id && isFinalAttempt) {
          console.error(`   ⚠️  CRITICAL: Email for order #${email.related_order_id} failed permanently!`);
        }
      }
    }

  } catch (error) {
    console.error('Email batch processing error:', error);
  } finally {
    client.release();
    isRunning = false;
  }
};

const startEmailWorker = () => {
  if (emailWorkerInterval) {
    console.log('📧 Email worker already running');
    return;
  }

  console.log('📧 Starting email outbox worker...');

  // Process immediately, then every 30 seconds
  processEmailBatch();
  emailWorkerInterval = setInterval(processEmailBatch, EMAIL_RETRY_DELAY_MS);
};

const stopEmailWorker = () => {
  if (emailWorkerInterval) {
    clearInterval(emailWorkerInterval);
    emailWorkerInterval = null;
    console.log('📧 Email worker stopped');
  }
};

/**
 * Add email to outbox (instead of sending directly)
 */
const queueEmail = async (to, subject, html, text, relatedOrderId = null, relatedType = null) => {
  try {
    await pool.query(`
      INSERT INTO email_outbox (to_address, subject, body_html, body_text, related_order_id, related_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [to, subject, html, text, relatedOrderId, relatedType]);

    console.log(`   📬 Queued email to ${to}: "${subject}"`);
    return true;
  } catch (error) {
    console.error('Failed to queue email:', error);
    // Fallback: try to send directly
    try {
      await sendEmail({ to, subject, html });
    } catch (directError) {
      console.error('Direct email send also failed:', directError);
    }
    return false;
  }
};

/**
 * ===== PENDING PAYMENT AUTO-CANCEL =====
 * Cancels unpaid bank transfer orders after 48 hours
 */

const checkPendingPayments = async () => {
  console.log('💳 Checking for stale pending payments...');

  const client = await pool.connect();
  try {
    // Find orders that:
    // 1. Are bank transfer payment method
    // 2. Are still pending after 48 hours
    // 3. Haven't been cancelled already
    const staleOrders = await client.query(`
      SELECT o.id, o.user_id, o.created_at, o.final_amount, o.shipping_address,
             u.email, u.full_name,
             (
               SELECT pr.status
               FROM payment_requests pr
               WHERE pr.order_id = o.id
               ORDER BY pr.created_at DESC
               LIMIT 1
             ) as payment_request_status
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.payment_method IN ('BANK_TRANSFER', 'bank_transfer')
        AND o.status = 'pending'
        AND o.created_at < NOW() - INTERVAL '${PAYMENT_CANCEL_HOURS} hours'
        AND o.deleted_at IS NULL
    `);

    if (staleOrders.rows.length === 0) {
      return;
    }

    console.log(`   Found ${staleOrders.rows.length} stale pending orders`);

    for (const order of staleOrders.rows) {
      // Skip if already has approved payment request (customer uploaded bill but not approved)
      if (order.payment_request_status === 'approved') {
        console.log(`   ⏭️  Skipping order #${order.id} - bill already approved`);
        continue;
      }

      // Check if already cancelled
      if (order.status === 'cancelled') {
        continue;
      }

      console.log(`   🔴 Cancelling stale order #${order.id} (pending since ${order.created_at})`);

      await client.query('BEGIN');

      try {
        // Cancel the order
        await client.query(`
          UPDATE orders
          SET status = 'cancelled',
              updated_at = NOW(),
              cancel_reason = 'Auto-cancel: Không nhận thanh toán sau ${PAYMENT_CANCEL_HOURS} giờ',
              cancelled_by = 0,
              cancelled_at = NOW()
          WHERE id = $1 AND status = 'pending'
        `, [order.id]);

        // Restore stock
        await client.query(`
          UPDATE products p
          SET stock = stock + oi.quantity,
              sold = GREATEST(sold - oi.quantity, 0)
          FROM order_items oi
          WHERE oi.order_id = $1 AND p.id = oi.product_id
        `, [order.id]);

        // Cancel payment status
        await client.query(`
          UPDATE payments
          SET payment_status = 'cancelled',
              updated_at = NOW()
          WHERE order_id = $1 AND payment_status = 'pending'
        `, [order.id]);

        // Queue cancellation email
        await queueEmail(
          order.email,
          `Đơn hàng #${order.id} đã bị hủy tự động`,
          `
            <h2>Thông báo hủy đơn hàng</h2>
            <p>Xin chào <strong>${order.full_name}</strong>,</p>
            <p>Đơn hàng <strong>#${order.id}</strong> của bạn đã bị hủy tự động do không nhận được xác nhận thanh toán trong vòng ${PAYMENT_CANCEL_HOURS} giờ.</p>
            <p>Nguyên nhân: Hệ thống không ghi nhận thanh toán cho đơn hàng này.</p>
            <p>Nếu bạn đã thanh toán, vui lòng liên hệ bộ phận hỗ trợ để được xác minh.</p>
            <p>Hoặc đặt hàng lại và thực hiện thanh toán đúng cách.</p>
            <p>Thông tin đơn hàng đã hủy:</p>
            <ul>
              <li>Mã đơn: #${order.id}</li>
              <li>Số tiền: ${new Intl.NumberFormat('vi-VN').format(order.final_amount)}đ</li>
              <li>Ngày đặt: ${new Date(order.created_at).toLocaleString('vi-VN')}</li>
            </ul>
            <p>Cảm ơn bạn đã quan tâm đến LaptopStore!</p>
          `,
          null,
          order.id,
          'order_cancellation'
        );

        await client.query('COMMIT');
        console.log(`   ✅ Cancelled order #${order.id}`);

      } catch (orderError) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Failed to cancel order #${order.id}:`, orderError.message);
      }
    }

  } catch (error) {
    console.error('Payment check error:', error);
  } finally {
    client.release();
  }
};

/**
 * Send reminder for pending payments (24h mark)
 */
const sendPaymentReminders = async () => {
  console.log('📬 Checking for payment reminders...');

  try {
    const pendingOrders = await pool.query(`
      SELECT o.id, o.user_id, o.created_at, o.final_amount, u.email, u.full_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.payment_method IN ('BANK_TRANSFER', 'bank_transfer')
        AND o.status = 'pending'
        AND o.created_at BETWEEN NOW() - INTERVAL '${PAYMENT_REMINDER_HOURS + 1} hours'
                           AND NOW() - INTERVAL '${PAYMENT_REMINDER_HOURS} hours'
        AND o.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM email_outbox eo
          WHERE eo.related_order_id = o.id
            AND eo.related_type = 'payment_reminder'
            AND eo.created_at > NOW() - INTERVAL '25 hours'
        )
    `);

    if (pendingOrders.rows.length === 0) {
      return;
    }

    console.log(`   Found ${pendingOrders.rows.length} orders needing reminders`);

    for (const order of pendingOrders.rows) {
      await queueEmail(
        order.email,
        `Nhắc nhở: Thanh toán đơn hàng #${order.id}`,
        `
          <h2>Nhắc nhở thanh toán</h2>
          <p>Xin chào <strong>${order.full_name}</strong>,</p>
          <p>Chúng tôi nhận thấy bạn có đơn hàng <strong>#${order.id}</strong> chưa được thanh toán.</p>
          <p>Thông tin thanh toán:</p>
          <ul>
            <li>Số tiền: <strong>${new Intl.NumberFormat('vi-VN').format(order.final_amount)}đ</strong></li>
            <li>Ngày đặt: ${new Date(order.created_at).toLocaleString('vi-VN')}</li>
          </ul>
          <p>Vui lòng thực hiện thanh toán trong vòng <strong>24 giờ</strong> để tránh đơn hàng bị hủy tự động.</p>
          <p>Nếu bạn đã thanh toán, vui lòng bỏ qua email này.</p>
          <p>Cảm ơn bạn!</p>
        `,
        null,
        order.id,
        'payment_reminder'
      );
    }

  } catch (error) {
    console.error('Payment reminder error:', error);
  }
};

/**
 * ===== STOCK NOTIFICATIONS =====
 * Send notifications when out-of-stock items become available
 */

const processStockNotifications = async () => {
  console.log('📦 Checking for stock notifications...');

  try {
    // Find products that:
    // 1. Were out of stock (have pending notifications)
    // 2. Now have stock > 0
    const restockedProducts = await pool.query(`
      SELECT DISTINCT p.id as product_id, p.name, p.price, p.image_url,
             sn.id as notification_id, sn.email, sn.phone
      FROM stock_notifications sn
      JOIN products p ON sn.product_id = p.id
      WHERE sn.is_sent = FALSE
        AND sn.deleted_at IS NULL
        AND p.stock > 0
        AND p.is_active = TRUE
        AND p.deleted_at IS NULL
    `);

    if (restockedProducts.rows.length === 0) {
      return;
    }

    console.log(`   Found ${restockedProducts.rows.length} restocked items with notifications`);

    for (const item of restockedProducts.rows) {
      try {
        // Send notification
        await queueEmail(
          item.email,
          `🎉 Sản phẩm "${item.name}" đã có hàng trở lại!`,
          `
            <h2>Thông báo sản phẩm đã có hàng</h2>
            <p>Xin chào,</p>
            <p>Sản phẩm bạn đã đăng ký thông báo đã có hàng trở lại:</p>
            <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0;">
              <h3>${item.name}</h3>
              <p><strong>Giá: ${new Intl.NumberFormat('vi-VN').format(item.price)}đ</strong></p>
              ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" style="max-width: 200px;">` : ''}
            </div>
            <p><a href="/products/${item.product_id}">Nhấn vào đây để xem chi tiết và đặt hàng</a></p>
            <p>Cảm ơn bạn đã quan tâm đến LaptopStore!</p>
          `,
          null,
          null,
          'stock_notification'
        );

        // Mark notification as sent
        await pool.query(`
          UPDATE stock_notifications
          SET is_sent = TRUE,
              sent_at = NOW()
          WHERE id = $1
        `, [item.notification_id]);

        console.log(`   ✅ Notified ${item.email} about ${item.name}`);

      } catch (error) {
        console.error(`   ❌ Failed to notify ${item.email}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Stock notification error:', error);
  }
};

/**
 * ===== IDEMPOTENCY KEYS CLEANUP =====
 * Remove expired idempotency keys
 */

const cleanupIdempotencyKeys = async () => {
  try {
    const result = await pool.query(`
      DELETE FROM idempotency_keys
      WHERE created_at < NOW() - INTERVAL '24 hours'
        AND completed_at IS NOT NULL
    `);

    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} expired idempotency keys`);
    }
  } catch (error) {
    console.error('Idempotency cleanup error:', error);
  }
};

/**
 * ===== START/STOP ALL JOBS =====
 */

const startAllJobs = () => {
  console.log('\n═══════════════════════════════════════════════');
  console.log('⚙️  Starting background jobs...');
  console.log('═══════════════════════════════════════════════\n');

  // Email worker - every 30 seconds
  startEmailWorker();

  // Payment checks - every hour
  paymentCheckInterval = setInterval(async () => {
    await checkPendingPayments();
    await sendPaymentReminders();
    await processStockNotifications();
    await cleanupIdempotencyKeys();
  }, 60 * 60 * 1000); // 1 hour

  // Run payment check immediately
  setTimeout(async () => {
    await checkPendingPayments();
    await sendPaymentReminders();
    await processStockNotifications();
  }, 5000); // After 5 seconds

  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Background jobs started');
  console.log('   • Email worker: every 30s');
  console.log('   • Payment check: every 1h');
  console.log('   • Stock notifications: every 1h');
  console.log('   • Idempotency cleanup: every 1h');
  console.log('═══════════════════════════════════════════════\n');
};

const stopAllJobs = () => {
  stopEmailWorker();
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
    paymentCheckInterval = null;
  }
  console.log('⏹️  All background jobs stopped');
};

module.exports = {
  startAllJobs,
  stopAllJobs,
  queueEmail,
  processEmailBatch,
  checkPendingPayments,
  processStockNotifications
};
