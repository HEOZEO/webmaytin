// Backfill/refresh SKU cho tất cả sản phẩm
// Format: LAP-{BRAND3}-{CAT3}-{ID4}
//   BRAND3: 3 ký tự đầu của brand (uppercase, không dấu)
//   CAT3:   mapping cố định cho category phổ biến, fallback 3 ký tự đầu
//
// SKU đã được insert lần trước với format "slug3 chữ cái đầu" (không tốt lắm).
// Lần này chạy lại với mapping tốt hơn — an toàn vì sku không có FK nào tham chiếu.
const { pool } = require('./config/database');

// Mapping category name (lowercase, có dấu) → 3-char code
const CATEGORY_CODES = {
  'văn phòng': 'OFF',
  'sinh viên': 'STD',
  'gaming':    'GMG',
  'đồ họa':   'GRH',
  'do hoa':    'GRH',
  'mỏng nhẹ':  'THN',
  'mong nhe':  'THN',
  'doanh nhân':'BIZ',
  'doanh nhan':'BIZ',
  'laptop':    'GEN',
};

// Map brand name → short code (1-3 chars, không pad)
const BRAND_CODES = {
  'dell':       'DEL',
  'hp':         'HP',
  'hewlett':    'HP',
  'lenovo':     'LEN',
  'apple':      'APP',
  'asus':       'ASU',
  'acer':       'ACE',
  'msi':        'MSI',
  'microsoft':  'MS',
  'samsung':    'SAM',
  'lg':         'LG',
  'razer':      'RAZ',
};

function noDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function pickBrandCode(name) {
  if (!name) return 'GEN';
  const norm = noDiacritics(String(name)).toLowerCase().trim();
  for (const key of Object.keys(BRAND_CODES)) {
    if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + '-')) {
      return BRAND_CODES[key];
    }
  }
  // Fallback: 3 ký tự đầu (không dấu, uppercase), pad X
  const clean = noDiacritics(String(name)).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (clean.slice(0, 3) || 'GEN').padEnd(3, 'X');
}

function pickCategoryCode(name) {
  if (!name) return 'GEN';
  const norm = noDiacritics(String(name)).toLowerCase().trim();
  if (CATEGORY_CODES[norm]) return CATEGORY_CODES[norm];
  // Fallback: 3 ký tự đầu (không dấu, uppercase), pad X
  const clean = noDiacritics(String(name)).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (clean.slice(0, 3) || 'GEN').padEnd(3, 'X');
}

(async () => {
  try {
    const rows = await pool.query(`
      SELECT p.id, p.name, p.sku,
             b.name AS brand_name,
             c.name AS category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id
    `);

    console.log(`Total products: ${rows.rows.length}`);

    const taken = new Set();

    const updates = [];
    for (const r of rows.rows) {
      const brand = pickBrandCode(r.brand_name);
      const cat = pickCategoryCode(r.category_name);
      const idPart = String(r.id).padStart(4, '0');
      let candidate;
      let n = 0;
      do {
        candidate = `LAP-${brand}-${cat}-${idPart}${n > 0 ? `-${n}` : ''}`;
        n++;
        if (n > 99) throw new Error(`Cannot generate unique SKU for product #${r.id}`);
      } while (taken.has(candidate));

      taken.add(candidate);
      updates.push({ id: r.id, name: r.name, oldSku: r.sku, newSku: candidate, brand, cat });
    }

    console.log('\n=== Preview (so sánh cũ ↔ mới) ===');
    console.table(updates.map(u => ({
      id: u.id,
      name: u.name,
      old: u.oldSku,
      new: u.newSku,
    })));

    // Apply
    let applied = 0;
    for (const u of updates) {
      await pool.query(`UPDATE products SET sku = $1 WHERE id = $2`, [u.newSku, u.id]);
      applied++;
    }

    console.log(`\n✅ Updated ${applied} products.`);

    // Verify
    const after = await pool.query(`
      SELECT id, name, sku FROM products ORDER BY id
    `);
    console.log('\n=== Verify (full list) ===');
    console.table(after.rows);

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE sku IS NOT NULL) AS has_sku,
        COUNT(*) FILTER (WHERE sku IS NULL) AS missing_sku
      FROM products
    `);
    console.log('\n=== Stats ===');
    console.log(stats.rows[0]);

    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    console.error(e);
    process.exit(1);
  }
})();
