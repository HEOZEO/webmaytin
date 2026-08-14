// update-db-images.js
// Cập nhật image_url cho từng sản phẩm trong DB trỏ về file SVG local.
// Sau khi chạy: mỗi sản phẩm có 1 ảnh riêng biệt, không còn trùng.
//
// Chạy: node update-db-images.js

const { pool, connectDatabase } = require('./server/config/database');
const path = require('path');

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F.-]+/g, '_').replace(/_+/g, '_');
}

// Map product_id → image path dựa trên tên trong DB
async function main() {
  await connectDatabase();
  const { rows } = await pool.query('SELECT id, name FROM products ORDER BY id');
  console.log(`Found ${rows.length} products in DB.`);

  let updated = 0, skipped = 0;
  for (const p of rows) {
    const filename = sanitize(p.name) + '.svg';
    const relativeUrl = `/images/products/${filename}`;
    await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [relativeUrl, p.id]);
    console.log(`  ✅ #${p.id} ${p.name} → ${relativeUrl}`);
    updated++;
  }
  console.log(`\nDone. Updated ${updated} rows.`);
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
