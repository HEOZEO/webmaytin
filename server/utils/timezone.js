/**
 * Timezone helper — đồng bộ tất cả query theo múi giờ Việt Nam (UTC+7).
 *
 * Vấn đề: DB lưu `created_at` ở UTC, nhưng người dùng & frontend thao tác
 * theo giờ VN. Nếu so sánh trực tiếp `created_at >= startDate` (VN date
 * dạng "2026-08-01"), DB sẽ hiểu là UTC → trượt mất các đơn trong khoảng
 * 00:00–07:00 sáng ngày 01/08 VN (= 17:00–24:00 ngày 31/07 UTC).
 *
 * Fix: ép toàn bộ `created_at` về Asia/Ho_Chi_Minh trước khi so sánh và group.
 */

const VN_TZ = 'Asia/Ho_Chi_Minh';

/**
 * Convert JS Date / ISO string → ISO string ở múi giờ VN (UTC+7).
 * Dùng để truyền vào parameter $1 của query SQL.
 *
 * @param {Date|string} d - JS Date object hoặc ISO string
 * @returns {string} ISO string có offset +07:00, ví dụ "2026-08-01T07:00:00+07:00"
 */
function toVNISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  // Get parts in VN timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+07:00`;
}

/**
 * Parse "YYYY-MM-DD" (ngày VN) thành Date object ở đầu ngày VN.
 * @param {string} dateStr - "2026-08-01"
 * @returns {Date} Date ở 00:00:00 +07:00
 */
function parseVNDate(dateStr) {
  // Append T00:00:00+07:00 để JS hiểu là giờ VN
  return new Date(`${dateStr}T00:00:00+07:00`);
}

/**
 * Parse "YYYY-MM-DD" (ngày VN) thành Date object ở cuối ngày VN.
 * @param {string} dateStr - "2026-08-01"
 * @returns {Date} Date ở 23:59:59.999 +07:00
 */
function parseVNDateEnd(dateStr) {
  return new Date(`${dateStr}T23:59:59.999+07:00`);
}

/**
 * Trả về SQL snippet để so sánh / group `created_at` theo giờ VN.
 *
 * @param {string} column - tên cột (vd: 'o.created_at', 'created_at')
 * @returns {string} SQL biểu thức (column AT TIME ZONE 'Asia/Ho_Chi_Minh')
 */
function vnTz(column) {
  return `(${column} AT TIME ZONE '${VN_TZ}')`;
}

module.exports = {
  VN_TZ,
  toVNISO,
  parseVNDate,
  parseVNDateEnd,
  vnTz
};