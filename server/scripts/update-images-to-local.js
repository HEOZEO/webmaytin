const { pool } = require('../config/database');

const PRODUCT_IMAGES = [
  // Dell
  { name_match: /Dell XPS/i, image: '/images/products/dell-xps-13-9320.svg' },
  { name_match: /Dell Inspiron/i, image: '/images/products/dell-inspiron-15.svg' },
  { name_match: /Dell Latitude/i, image: '/images/products/dell-latitude-7420.svg' },
  { name_match: /Dell Gaming|Dell G15/i, image: '/images/products/dell-gaming-g15.svg' },

  // HP
  { name_match: /HP Pavilion/i, image: '/images/products/hp-pavilion-15.svg' },
  { name_match: /HP Envy/i, image: '/images/products/hp-envy-13.svg' },
  { name_match: /HP Omen/i, image: '/images/products/hp-omen-16.svg' },
  { name_match: /HP Spectre/i, image: '/images/products/hp-spectre-x360.svg' },

  // Asus
  { name_match: /ROG Strix|ROG/i, image: '/images/products/asus-rog-strix-g15.svg' },
  { name_match: /ZenBook|Zenbook/i, image: '/images/products/asus-zenbook-14.svg' },
  { name_match: /TUF Gaming/i, image: '/images/products/asus-tuf-f15.svg' },
  { name_match: /VivoBook|Vivobook/i, image: '/images/products/asus-vivobook-15.svg' },

  // Lenovo
  { name_match: /ThinkPad/i, image: '/images/products/lenovo-thinkpad-e14.svg' },
  { name_match: /Legion/i, image: '/images/products/lenovo-legion-5.svg' },
  { name_match: /IdeaPad/i, image: '/images/products/lenovo-ideapad-3.svg' },
  { name_match: /Yoga/i, image: '/images/products/lenovo-yoga-slim-7.svg' },

  // Apple
  { name_match: /MacBook Pro.*M2|MacBook Pro 14/i, image: '/images/products/macbook-pro-14-m2.svg' },
  { name_match: /MacBook Air.*M3|MacBook Air 15/i, image: '/images/products/macbook-air-m3.svg' },
  { name_match: /MacBook Air|MacBook/i, image: '/images/products/macbook-air-m1.svg' },

  // MSI
  { name_match: /MSI.*Gaming|Katana/i, image: '/images/products/msi-gaming-katana.svg' },
  { name_match: /MSI.*Prestige|Prestige/i, image: '/images/products/msi-prestige-14.svg' },

  // Acer
  { name_match: /Acer Aspire/i, image: '/images/products/acer-aspire-5.svg' },
  { name_match: /Acer Nitro/i, image: '/images/products/acer-nitro-5.svg' },

  // LG & Razer
  { name_match: /LG Gram|LG/i, image: '/images/products/lg-gram-16.svg' },
  { name_match: /Razer/i, image: '/images/products/razer-blade-15.svg' },

  // Fallback matches for products in DB not yet covered
  { name_match: /Vostro/i, image: '/images/products/dell-inspiron-15.svg' },
  { name_match: /EliteBook/i, image: '/images/products/hp-envy-13.svg' },
  { name_match: /Predator/i, image: '/images/products/acer-nitro-5.svg' },
  { name_match: /Modern 14/i, image: '/images/products/msi-prestige-14.svg' },
  { name_match: /GF63/i, image: '/images/products/msi-gaming-katana.svg' },
  { name_match: /Swift 3/i, image: '/images/products/acer-aspire-5.svg' },
  { name_match: /GP66 Leopard/i, image: '/images/products/msi-gaming-katana.svg' }
];

const CATEGORY_BANNERS = [
  { name_match: /Gaming|gaming|ROG|TUF|Legion|Omen|Katana/i, fallback: '/images/categories/gaming.svg' },
  { name_match: /MacBook|Apple/i, fallback: '/images/categories/macbook.svg' },
  { name_match: /Văn phòng|Văn Phòng|Sinh viên|Sinh Viên/i, fallback: '/images/categories/laptop.svg' }
];

const DEFAULT_FALLBACK = '/images/fallback/no-image.svg';

function pickImage(productName) {
  const matched = PRODUCT_IMAGES.find(p => p.name_match.test(productName));
  if (matched) return matched.image;
  return DEFAULT_FALLBACK;
}

async function updateProductImages() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(`
      SELECT id, name, image_url FROM products
    `);

    console.log(`📦 Tìm thấy ${rows.length} sản phẩm để cập nhật ảnh`);

    let updated = 0;
    for (const product of rows) {
      const newImage = pickImage(product.name);
      // Lưu path tương đối - frontend sẽ resolve qua Vite public folder OR backend static
      const fullPath = newImage.startsWith('/') ? newImage : `/images/products/${newImage}`;

      await client.query(
        'UPDATE products SET image_url = $1 WHERE id = $2',
        [fullPath, product.id]
      );
      updated++;
      console.log(`  ✓ ${product.name} → ${newImage}`);
    }

    await client.query('COMMIT');
    console.log(`\n✅ Đã cập nhật ảnh cho ${updated} sản phẩm`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  updateProductImages()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updateProductImages, pickImage, PRODUCT_IMAGES };
