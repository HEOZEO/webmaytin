// generate-product-images.js
// Tạo ảnh SVG độc đáo cho từng sản phẩm laptop — dùng gradient + brand + model text.
// Mỗi sản phẩm có 1 bộ màu riêng (deterministic theo tên) → KHÔNG BAO GIỜ trùng.
//
// Chạy: node generate-product-images.js
// Output: client/public/images/products/<sanitized-name>.svg

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'client', 'public', 'images', 'products');

// ─── 28 sản phẩm từ DB (id → name, brand accent color) ─────────────────────────
const PRODUCTS = [
  { id: 1,  name: 'Acer Aspire 3 A315-58',          brand: 'Acer',    accent: '#5fbf6f', hue: 130 },
  { id: 2,  name: 'Acer Nitro 5 AN515-58',          brand: 'Acer',    accent: '#e23b3b', hue: 0   },
  { id: 3,  name: 'Acer Predator Helios 300',       brand: 'Acer',    accent: '#1d1d1d', hue: 0,   dark: true },
  { id: 4,  name: 'Acer Swift 3 SF314-512',         brand: 'Acer',    accent: '#7c3aed', hue: 270 },
  { id: 5,  name: 'Asus ROG Strix G15',             brand: 'Asus',    accent: '#dc2626', hue: 0   },
  { id: 6,  name: 'Asus TUF Gaming F15',            brand: 'Asus',    accent: '#2563eb', hue: 220 },
  { id: 7,  name: 'Asus VivoBook 15 X515',          brand: 'Asus',    accent: '#0891b2', hue: 190 },
  { id: 8,  name: 'Asus ZenBook 14',                brand: 'Asus',    accent: '#a78bfa', hue: 260 },
  { id: 9,  name: 'Dell Gaming G15 5520',           brand: 'Dell',    accent: '#0070d8', hue: 210 },
  { id: 10, name: 'Dell Inspiron 3520',             brand: 'Dell',    accent: '#06b6d4', hue: 185 },
  { id: 11, name: 'Dell Vostro 3520',               brand: 'Dell',    accent: '#64748b', hue: 215 },
  { id: 12, name: 'Dell XPS 13 9320',               brand: 'Dell',    accent: '#94a3b8', hue: 220, dark: true },
  { id: 13, name: 'HP EliteBook 840 G9',            brand: 'HP',      accent: '#1e40af', hue: 220 },
  { id: 14, name: 'HP Envy 13-ba1030TU',            brand: 'HP',      accent: '#f59e0b', hue: 40  },
  { id: 15, name: 'HP Omen 16-c0142AX',             brand: 'HP',      accent: '#dc2626', hue: 0,   dark: true },
  { id: 16, name: 'HP Pavilion 15-eg2058TX',        brand: 'HP',      accent: '#c026d3', hue: 290 },
  { id: 17, name: 'Lenovo IdeaPad Gaming 3',         brand: 'Lenovo',  accent: '#0ea5e9', hue: 200 },
  { id: 18, name: 'Lenovo Legion 5',                brand: 'Lenovo',  accent: '#22c55e', hue: 140, dark: true },
  { id: 19, name: 'Lenovo ThinkPad E14 Gen 4',      brand: 'Lenovo',  accent: '#1f2937', hue: 220, dark: true },
  { id: 20, name: 'Lenovo Yoga Slim 7',             brand: 'Lenovo',  accent: '#ec4899', hue: 330 },
  { id: 21, name: 'MacBook Air M1 2020',            brand: 'Apple',   accent: '#cbd5e1', hue: 220, dark: true },
  { id: 22, name: 'MacBook Air M2 2022',            brand: 'Apple',   accent: '#fde047', hue: 50,  dark: true },
  { id: 23, name: 'MacBook Pro 13 M2',              brand: 'Apple',   accent: '#a3a3a3', hue: 0,   dark: true },
  { id: 24, name: 'MacBook Pro 14 M2 Pro',          brand: 'Apple',   accent: '#737373', hue: 0,   dark: true },
  { id: 25, name: 'MSI Gaming Katana GF66',         brand: 'MSI',     accent: '#ef4444', hue: 0   },
  { id: 26, name: 'MSI GF63 Thin 11SC',             brand: 'MSI',     accent: '#0f172a', hue: 220, dark: true },
  { id: 27, name: 'MSI GP66 Leopard',               brand: 'MSI',     accent: '#f97316', hue: 25  },
  { id: 28, name: 'MSI Modern 14 C12M',             brand: 'MSI',     accent: '#14b8a6', hue: 170 },
];

const W = 800, H = 600;

// Hàm tạo SVG cho 1 sản phẩm — mỗi sản phẩm có bố cục khác nhau (deterministic theo id)
function makeSvg(p) {
  const isDark = !!p.dark;
  const bgStart = isDark ? '#0f172a' : '#1e293b';
  const bgEnd   = isDark ? '#1e293b' : '#334155';

  // 4 layout variants dựa theo id để đảm bảo mỗi ảnh khác nhau rõ rệt
  const layout = p.id % 4;

  // Laptop body (vẽ tay đơn giản) — geometry thay đổi theo layout
  const laptopColor = isDark ? '#0a0a0a' : '#1f2937';
  const screenColor = p.accent;
  const screen2 = `hsl(${p.hue}, 70%, ${isDark ? 20 : 55}%)`;

  // Logo icon shape đa dạng: tròn, vuông, tam giác, hexagon
  const logoShapes = [
    `<circle cx="400" cy="280" r="55" fill="${p.accent}" opacity="0.9"/>`,
    `<rect x="345" y="225" width="110" height="110" rx="14" fill="${p.accent}" opacity="0.9"/>`,
    `<polygon points="400,220 470,330 330,330" fill="${p.accent}" opacity="0.9"/>`,
    `<polygon points="400,225 455,265 455,335 400,375 345,335 345,265" fill="${p.accent}" opacity="0.9"/>`
  ];

  // Background pattern: dots / grid / waves / circles — khác nhau theo layout
  const bgPatterns = [
    `<pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
       <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.08"/>
     </pattern>`,
    `<pattern id="grid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
       <path d="M50 0 L0 0 0 50" fill="none" stroke="white" stroke-opacity="0.07" stroke-width="1"/>
     </pattern>`,
    `<pattern id="waves" x="0" y="0" width="80" height="20" patternUnits="userSpaceOnUse">
       <path d="M0 10 Q20 0 40 10 T80 10" fill="none" stroke="white" stroke-opacity="0.08" stroke-width="1.5"/>
     </pattern>`,
    `<pattern id="cross" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
       <path d="M25 25 L35 35 M35 25 L25 35" stroke="white" stroke-opacity="0.08" stroke-width="1.5"/>
     </pattern>`
  ];
  const patternId = ['dots', 'grid', 'waves', 'cross'][layout];

  // Laptop angle/offset varies per layout
  const laptopOffsets = [
    { tx: 0,   ty: 0  },
    { tx: -20, ty: 10 },
    { tx: 15,  ty: -10 },
    { tx: 0,   ty: 20 }
  ];
  const off = laptopOffsets[layout];

  // Text size / position varies
  const titleY = layout === 0 ? 110 : layout === 1 ? 95 : layout === 2 ? 115 : 90;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg${p.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgStart}"/>
      <stop offset="100%" stop-color="${bgEnd}"/>
    </linearGradient>
    <linearGradient id="screen${p.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${screenColor}"/>
      <stop offset="100%" stop-color="${screen2}"/>
    </linearGradient>
    <radialGradient id="glow${p.id}" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    ${bgPatterns[layout]}
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg${p.id})"/>
  <rect width="${W}" height="${H}" fill="url(#${patternId})"/>
  <ellipse cx="400" cy="280" rx="350" ry="240" fill="url(#glow${p.id})"/>

  <!-- Brand tag top-left -->
  <rect x="32" y="32" width="${p.brand.length * 14 + 24}" height="40" rx="10" fill="${p.accent}"/>
  <text x="${32 + (p.brand.length * 14 + 24) / 2}" y="58" text-anchor="middle"
        font-family="-apple-system, Segoe UI, sans-serif" font-size="18" font-weight="700" fill="${isDark ? '#0f172a' : '#fff'}">
    ${p.brand.toUpperCase()}
  </text>

  <!-- Model ID top-right -->
  <text x="${W - 40}" y="58" text-anchor="end"
        font-family="-apple-system, Segoe UI, sans-serif" font-size="14" font-weight="600" fill="rgba(255,255,255,0.5)">
    ID #${String(p.id).padStart(3, '0')}
  </text>

  <!-- Title -->
  <text x="40" y="${titleY}" font-family="-apple-system, Segoe UI, sans-serif"
        font-size="34" font-weight="800" fill="white">
    ${p.name.length > 28 ? p.name.slice(0, 28) + '…' : p.name}
  </text>

  <!-- Subtitle -->
  <text x="40" y="${titleY + 28}" font-family="-apple-system, Segoe UI, sans-serif"
        font-size="14" font-weight="500" fill="rgba(255,255,255,0.55)">
    Laptop ${p.brand} chính hãng
  </text>

  <!-- Laptop body (open) — translated by layout -->
  <g transform="translate(${400 + off.tx}, ${320 + off.ty})">
    <!-- Screen lid -->
    <rect x="-220" y="-150" width="440" height="280" rx="12" fill="${laptopColor}" stroke="${p.accent}" stroke-width="2"/>
    <!-- Screen content -->
    <rect x="-205" y="-135" width="410" height="250" rx="6" fill="url(#screen${p.id})"/>
    <!-- Screen reflection -->
    <polygon points="-205,-135 205,-135 80,115 -205,115" fill="white" opacity="0.08"/>

    <!-- Logo inside screen -->
    ${logoShapes[layout]}

    <!-- Logo text -->
    <text x="0" y="80" text-anchor="middle" font-family="-apple-system, Segoe UI, sans-serif"
          font-size="22" font-weight="800" fill="white" opacity="0.95">
      ${p.brand}
    </text>
    <text x="0" y="100" text-anchor="middle" font-family="-apple-system, Segoe UI, sans-serif"
          font-size="11" font-weight="500" fill="rgba(255,255,255,0.7)">
      Series ${p.id}
    </text>

    <!-- Keyboard base -->
    <path d="M -240 130 L 240 130 L 260 165 L -260 165 Z" fill="${laptopColor}" stroke="${p.accent}" stroke-width="2"/>
    <!-- Trackpad -->
    <rect x="-50" y="140" width="100" height="6" rx="3" fill="${p.accent}" opacity="0.4"/>
  </g>

  <!-- Bottom footer -->
  <line x1="40" y1="555" x2="${W - 40}" y2="555" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="40" y="580" font-family="-apple-system, Segoe UI, sans-serif"
        font-size="12" fill="rgba(255,255,255,0.4)">
    shopmaytinh.vn
  </text>
  <text x="${W - 40}" y="580" text-anchor="end" font-family="-apple-system, Segoe UI, sans-serif"
        font-size="12" font-weight="600" fill="${p.accent}">
    ${p.accent.toUpperCase()}
  </text>
</svg>`;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F.-]+/g, '_').replace(/_+/g, '_');
}

// Run
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let created = 0;
for (const p of PRODUCTS) {
  const svg = makeSvg(p);
  // Always create SVG version (vector, no overlap concerns)
  const svgPath = path.join(OUTPUT_DIR, sanitizeFilename(p.name) + '.svg');
  fs.writeFileSync(svgPath, svg);
  created++;
}
console.log(`✅ Generated ${created} SVG files in ${OUTPUT_DIR}`);
console.log('   Mỗi sản phẩm có brand color, layout, background pattern và logo shape khác nhau.');
console.log('   Sau khi generate, chạy script update DB để map image_url.');
