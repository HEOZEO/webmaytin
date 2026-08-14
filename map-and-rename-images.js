// map-and-rename-images.js
// Map file ảnh thực tế trong client/public/images/products/ với tên sản phẩm trong DB,
// đổi tên file ảnh theo sanitize scheme (khoảng trắng → _, giữ nguyên extension).
// Sau đó update DB image_url trỏ về file mới.
//
// Mặc định chỉ IN preview mapping. Truyền --apply để thực sự rename + update DB.

const { pool, connectDatabase } = require('./server/config/database');
const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.join(__dirname, 'client', 'public', 'images', 'products');

function sanitize(name) {
  return name
    .replace(/"/g, '') // strip double quotes like MacBook Pro 13"
    .replace(/[^a-zA-Z0-9\u00C0-\u024F.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const APPLY = process.argv.includes('--apply');

function findFileForProduct(productName, allFiles) {
  const stem = sanitize(productName).toLowerCase();
  // exact match first
  const exact = allFiles.find(f => f.stem.toLowerCase() === stem);
  if (exact) return exact;
  // fuzzy: ignore quotes/dashes differences
  const norm = s => s.toLowerCase().replace(/["-]/g, '').replace(/_/g, '');
  const fuzzy = allFiles.find(f => norm(f.stem) === norm(productName));
  return fuzzy || null;
}

async function main() {
  const apply = APPLY;
  if (apply) console.log('⚙️  APPLY MODE — files will be renamed + DB updated\n');
  else console.log('👀 PREVIEW MODE — no changes. Re-run with --apply to commit.\n');

  // List image files (jpg/jpeg/webp/png only — skip generated SVGs)
  const EXT_ALLOW = new Set(['.jpg', '.jpeg', '.webp', '.png']);
  const allFiles = fs.readdirSync(PRODUCTS_DIR)
    .filter(f => EXT_ALLOW.has(path.extname(f).toLowerCase()))
    .map(f => {
      const ext = path.extname(f);
      const stem = path.basename(f, ext);
      return { original: f, ext, stem, fullPath: path.join(PRODUCTS_DIR, f) };
    });

  console.log(`📁 Found ${allFiles.length} image files.\n`);

  await connectDatabase();
  const { rows } = await pool.query('SELECT id, name, image_url FROM products ORDER BY id');

  const renames = [];
  const unmatched = [];

  for (const p of rows) {
    const file = findFileForProduct(p.name, allFiles);
    if (!file) {
      unmatched.push(p);
      continue;
    }
    const targetName = sanitize(p.name) + file.ext;
    const targetUrl  = `/images/products/${targetName}`;
    renames.push({
      productId: p.id,
      productName: p.name,
      from: file.original,
      to: targetName,
      url: targetUrl,
      currentDbUrl: p.image_url,
    });
  }

  console.log('Mapping preview:');
  console.log('─'.repeat(110));
  console.log('ID  | Product name                | Current file           →  New file (DB)');
  console.log('─'.repeat(110));
  renames.forEach(r => {
    const arrow = r.from === r.to ? '=' : '→';
    const cur = r.from.padEnd(20);
    console.log(`#${String(r.productId).padEnd(3)} | ${r.productName.padEnd(28)} | ${cur}  ${arrow}  ${r.to}`);
  });
  console.log('─'.repeat(110));

  if (unmatched.length) {
    console.log('\n⚠️  No file found for these products:');
    unmatched.forEach(p => console.log(`    #${p.id} ${p.name}`));
  }

  if (!apply) {
    console.log('\nRun with --apply to rename files + update DB.');
    await pool.end();
    return;
  }

  // ── APPLY: rename + update DB ─────────────────────────────────────────
  console.log('\nApplying renames…');
  for (const r of renames) {
    if (r.from !== r.to) {
      const fromPath = path.join(PRODUCTS_DIR, r.from);
      const toPath   = path.join(PRODUCTS_DIR, r.to);
      if (fs.existsSync(toPath) && r.from !== r.to) {
        console.log(`  ⏭  Skip ${r.from}: target ${r.to} already exists`);
      } else {
        fs.renameSync(fromPath, toPath);
      }
    }
    await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [r.url, r.productId]);
  }

  console.log(`\n✅ Renamed + updated DB for ${renames.length} products.`);
  if (unmatched.length) {
    console.log(`⚠️  ${unmatched.length} products still unmatched — need a new image upload.`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});