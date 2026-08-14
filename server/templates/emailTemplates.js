// HTML email templates for various transactional notifications.
// Plain HTML strings with subtle styling — works in Gmail, Outlook, Apple Mail,
// and falls back gracefully on plain-text clients.

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + 'đ';
}

/**
 * Render the order-confirmation email sent to the customer right after
 * an order is committed to the database.
 *
 * @param {object} order - { id, total_amount, discount_amount, final_amount, shipping_address, payment_method, ...}
 * @param {Array} items - [{ name, quantity, price }]
 * @param {object} user - { email, full_name }
 */
function orderConfirmation(order, items, user) {
  const itemsRows = (items || []).map((it) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 14px;">
        ${escapeHtml(it.name)}
      </td>
      <td align="center" style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 14px;">
        ${Number(it.quantity || 1)}
      </td>
      <td align="right" style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 14px;">
        ${formatVND(it.price)}
      </td>
      <td align="right" style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #06b6d4; font-weight: 600; font-size: 14px;">
        ${formatVND(Number(it.price || 0) * Number(it.quantity || 1))}
      </td>
    </tr>
  `).join('');

  const hasDiscount = Number(order.discount_amount || 0) > 0;
  const paymentLabel = String(order.payment_method || '').toLowerCase() === 'cod'
    ? 'Thanh toán khi nhận hàng (COD)'
    : 'Chuyển khoản ngân hàng';

  return `
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Xác nhận đơn hàng #${escapeHtml(order.id)}</title>
</head>
<body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #1e293b; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 16px; text-align: center; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Laptop Store</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Đơn hàng đã được xác nhận</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 8px; color: #f1f5f9; font-size: 18px;">Xin chào ${escapeHtml(user.full_name || 'bạn')},</h2>
              <p style="margin: 0 0 16px; color: #94a3b8; font-size: 14px; line-height: 1.55;">
                Cảm ơn bạn đã đặt hàng tại <strong style="color: #06b6d4;">Laptop Store</strong>.
                Đơn hàng <strong style="color: #f1f5f9;">#${escapeHtml(order.id)}</strong> của bạn đã được ghi nhận thành công.
              </p>

              <h3 style="margin: 24px 0 12px; color: #f1f5f9; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Sản phẩm</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #0b1220;">
                    <th align="left"  style="padding: 10px 12px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Sản phẩm</th>
                    <th align="center" style="padding: 10px 12px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">SL</th>
                    <th align="right" style="padding: 10px 12px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Đơn giá</th>
                    <th align="right" style="padding: 10px 12px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                <tr>
                  <td align="right" style="color: #94a3b8; padding: 4px 0; font-size: 14px;">Tạm tính:</td>
                  <td align="right" width="120" style="color: #f1f5f9; padding: 4px 0; font-size: 14px;">${formatVND(order.total_amount)}</td>
                </tr>
                ${hasDiscount ? `
                <tr>
                  <td align="right" style="color: #94a3b8; padding: 4px 0; font-size: 14px;">Giảm giá:</td>
                  <td align="right" style="color: #22c55e; padding: 4px 0; font-size: 14px;">-${formatVND(order.discount_amount)}</td>
                </tr>` : ''}
                <tr>
                  <td align="right" style="color: #f1f5f9; padding: 12px 0 0; border-top: 1px solid #334155; font-size: 16px; font-weight: 700;">Tổng cộng:</td>
                  <td align="right" style="color: #06b6d4; padding: 12px 0 0; border-top: 1px solid #334155; font-size: 18px; font-weight: 800;">${formatVND(order.final_amount)}</td>
                </tr>
              </table>

              <h3 style="margin: 24px 0 12px; color: #f1f5f9; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Thông tin giao hàng</h3>
              <div style="background: #0f172a; padding: 16px; border-radius: 8px; color: #cbd5e1; font-size: 14px; line-height: 1.7;">
                <div><strong style="color: #94a3b8;">Địa chỉ:</strong> ${escapeHtml(order.shipping_address)}</div>
                <div><strong style="color: #94a3b8;">Phương thức thanh toán:</strong> ${escapeHtml(paymentLabel)}</div>
              </div>

              <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để xác nhận thời gian giao hàng.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; text-align: center; background: #0b1220; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} Laptop Store · Hotline: 1900-xxxx · Email: support@laptopstore.vn
              </p>
              <p style="margin: 8px 0 0; color: #475569; font-size: 11px;">
                Email này được gửi tự động, vui lòng không trả lời trực tiếp.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Order-status update notification (e.g. order shipped, delivered, cancelled).
 */
function orderStatusUpdate(order, user, newStatus) {
  const statusMap = {
    pending:    { label: 'Chờ xác nhận',     color: '#eab308' },
    confirmed:  { label: 'Đã xác nhận',      color: '#06b6d4' },
    shipping:   { label: 'Đang giao hàng',   color: '#3b82f6' },
    delivered:  { label: 'Đã giao',          color: '#22c55e' },
    completed:  { label: 'Hoàn tất',         color: '#22c55e' },
    cancelled:  { label: 'Đã hủy',           color: '#ef4444' }
  };
  const status = statusMap[newStatus] || { label: newStatus, color: '#94a3b8' };

  return `
<!doctype html>
<html lang="vi">
<body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #1e293b; border-radius: 16px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #f1f5f9; font-size: 20px;">Đơn hàng #${escapeHtml(order.id)} đã được cập nhật</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0 0 16px; color: #94a3b8; font-size: 14px;">Xin chào ${escapeHtml(user.full_name || 'bạn')},</p>
              <div style="background: #0f172a; padding: 24px; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Trạng thái mới</p>
                <p style="margin: 0; color: ${status.color}; font-size: 24px; font-weight: 800;">${escapeHtml(status.label)}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

module.exports = {
  orderConfirmation,
  orderStatusUpdate
};
