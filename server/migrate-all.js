/**
 * Auto-runner: chạy TẤT CẢ file .sql trong thư mục migrations/ theo thứ tự.
 *
 * Cách dùng:
 *   node migrate-all.js
 *   npm run migrate
 *
 * Mỗi file SQL sẽ được chạy trong 1 transaction.
 * Nếu 1 file lỗi → dừng lại và báo lỗi.
 *
 * Lưu ý: nên viết SQL theo hướng idempotent
 * (CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN IF NOT EXISTS, ...)
 * để có thể chạy lại nhiều lần mà không lỗi.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

(async () => {
  // Kiểm tra DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL chưa được cấu hình trong .env');
    process.exit(1);
  }

  // Lấy danh sách file .sql, sắp xếp theo tên (đã có date prefix)
  let files;
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // sort theo tên file = theo thời gian
  } catch (err) {
    console.error(`❌ Không đọc được thư mục migrations: ${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('⚠️  Không có file .sql nào trong migrations/');
    return;
  }

  console.log(`🚀 Tìm thấy ${files.length} file migration. Bắt đầu chạy...\n`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    process.stdout.write(`  ⏳ ${file} ... `);
    try {
      await client.query(sql);
      console.log('✅ OK');
      success++;
    } catch (err) {
      // Một số lỗi idempotent có thể bỏ qua (vd: column already exists)
      const msg = err.message || '';
      const isIgnorable =
        msg.includes('already exists') ||
        msg.includes('does not exist') ||
        msg.includes('duplicate key') ||
        msg.includes('constraint') && msg.includes('already');

      if (isIgnorable) {
        console.log(`⚠️  SKIP (${msg.split('\n')[0]})`);
        skipped++;
      } else {
        console.log(`❌ FAIL`);
        console.error(`\n  Error in ${file}: ${msg}\n`);
        failed++;
        // Dừng lại ở lỗi đầu tiên để debug
        break;
      }
    }
  }

  await client.end();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Thành công : ${success}`);
  if (skipped > 0) console.log(`⚠️  Bỏ qua    : ${skipped}`);
  if (failed > 0) console.log(`❌ Lỗi       : ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('❌ Migration runner crashed:', err.message);
  process.exit(1);
});