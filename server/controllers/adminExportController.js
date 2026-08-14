// Admin exports: orders → Excel (.xlsx)
// Supports filters: status, fromDate, toDate, customerId.
// Uses `xlsx` (SheetJS) — pure JS, no native deps, works on any platform.

const XLSX = require('xlsx');
const { pool } = require('../config/database');

/**
 * GET /api/admin/orders/export?status=&fromDate=&toDate=&customerId=
 * Streams an .xlsx file of orders matching the filters.
 */
exports.exportOrders = async (req, res) => {
  try {
    const { status, fromDate, toDate, customerId } = req.query;

    const params = [];
    const conditions = ['o.deleted_at IS NULL'];

    if (status) {
      params.push(String(status).toLowerCase());
      conditions.push(`LOWER(o.status) = $${params.length}`);
    }
    if (customerId) {
      params.push(Number(customerId));
      conditions.push(`o.user_id = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`o.created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`o.created_at <= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         o.id,
         o.created_at,
         o.status,
         o.total_amount,
         o.discount_amount,
         o.shipping_fee,
         o.final_amount,
         o.payment_method,
         o.shipping_address,
         o.phone,
         o.notes,
         u.email        AS customer_email,
         u.full_name    AS customer_name,
         u.phone        AS customer_phone,
         COUNT(oi.id)   AS item_count,
         STRING_AGG(p.name || ' (×' || oi.quantity || ')', '; ') AS items_summary
       FROM orders o
       LEFT JOIN users u        ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p     ON oi.product_id = p.id
       ${where}
       GROUP BY o.id, u.email, u.full_name, u.phone
       ORDER BY o.created_at DESC
       LIMIT 10000`,
      params
    );

    // Translate row → Vietnamese header columns
    const rows = result.rows.map((r) => ({
      'Mã đơn': r.id,
      'Ngày tạo': new Date(r.created_at).toLocaleString('vi-VN'),
      'Trạng thái': statusLabel(r.status),
      'Khách hàng': r.customer_name || '',
      'Email': r.customer_email || '',
      'Số điện thoại': r.customer_phone || r.phone || '',
      'Tổng tiền (đ)': Number(r.total_amount || 0),
      'Giảm giá (đ)': Number(r.discount_amount || 0),
      'Phí ship (đ)': Number(r.shipping_fee || 0),
      'Thanh toán (đ)': Number(r.final_amount || 0),
      'Thanh toán': paymentLabel(r.payment_method),
      'Số SP': r.item_count,
      'Sản phẩm': r.items_summary || '',
      'Địa chỉ giao': r.shipping_address || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: false });

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 8 },   // Mã đơn
      { wch: 18 },  // Ngày tạo
      { wch: 12 },  // Trạng thái
      { wch: 25 },  // Khách hàng
      { wch: 28 },  // Email
      { wch: 14 },  // Số điện thoại
      { wch: 14 },  // Tổng tiền
      { wch: 12 },  // Giảm giá
      { wch: 12 },  // Phí ship
      { wch: 14 },  // Thanh toán
      { wch: 14 },  // Thanh toán (COD/Bank)
      { wch: 8 },   // Số SP
      { wch: 60 },  // Sản phẩm
      { wch: 40 }   // Địa chỉ giao
    ];

    const workbook = XLSX.utils.book_new();
    // ASCII sheet names for maximum compatibility across Excel versions (xlsx
    // otherwise may rename Unicode sheets to "Sheet1" on readback).
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Add a tiny summary sheet
    const summary = [
      ['Báo cáo đơn hàng - Laptop Store'],
      ['Ngày xuất:', new Date().toLocaleString('vi-VN')],
      ['Tổng số đơn:', rows.length],
      [],
      ['Bộ lọc áp dụng'],
      ['Trạng thái:', status || '(tất cả)'],
      ['Từ ngày:', fromDate || '(không)'],
      ['Đến ngày:', toDate || '(không)'],
      ['Khách hàng ID:', customerId || '(tất cả)']
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 22 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xuất đơn hàng' });
  }
};

function statusLabel(status) {
  const map = {
    pending:   'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping:  'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy'
  };
  return map[String(status || '').toLowerCase()] || (status || '');
}

function paymentLabel(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'cod') return 'COD';
  if (m === 'bank_transfer') return 'Chuyển khoản';
  return m || '';
}
