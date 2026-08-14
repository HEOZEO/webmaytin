#!/usr/bin/env node
/**
 * Generate high-quality SVG product images locally
 * Run: node scripts/generate-product-images.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'products');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PRODUCTS = [
  // ===== Dell =====
  { slug: 'dell-xps-13-9320', brand: 'Dell', name: 'XPS 13 9320', cpu: 'i7-1260P', ram: '16GB', color: '#06b6d4', accent: '#0e7490', tag: 'Premium' },
  { slug: 'dell-inspiron-15', brand: 'Dell', name: 'Inspiron 15 5510', cpu: 'i5-1135G7', ram: '8GB', color: '#0ea5e9', accent: '#0369a1', tag: 'Văn Phòng' },
  { slug: 'dell-latitude-7420', brand: 'Dell', name: 'Latitude 7420', cpu: 'i5-1145G7', ram: '16GB', color: '#0891b2', accent: '#155e75', tag: 'Doanh Nhân' },
  { slug: 'dell-gaming-g15', brand: 'Dell', name: 'Gaming G15 5525', cpu: 'R7-6800H', ram: '16GB', color: '#a855f7', accent: '#7e22ce', tag: 'Gaming' },

  // ===== HP =====
  { slug: 'hp-pavilion-15', brand: 'HP', name: 'Pavilion 15 eg2035TU', cpu: 'i5-1235U', ram: '8GB', color: '#3b82f6', accent: '#1d4ed8', tag: 'Phổ Thông' },
  { slug: 'hp-envy-13', brand: 'HP', name: 'Envy 13 ba1535TU', cpu: 'i7-1165G7', ram: '16GB', color: '#2563eb', accent: '#1e3a8a', tag: 'Cao Cấp' },
  { slug: 'hp-omen-16', brand: 'HP', name: 'Omen 16 2023', cpu: 'i7-13700HX', ram: '16GB', color: '#dc2626', accent: '#991b1b', tag: 'Gaming' },
  { slug: 'hp-spectre-x360', brand: 'HP', name: 'Spectre x360 14', cpu: 'i7-1355U', ram: '16GB', color: '#1e40af', accent: '#172554', tag: 'Premium' },

  // ===== Asus =====
  { slug: 'asus-rog-strix-g15', brand: 'Asus', name: 'ROG Strix G15 G513', cpu: 'R7-5800H', ram: '16GB', color: '#7c3aed', accent: '#5b21b6', tag: 'Gaming' },
  { slug: 'asus-zenbook-14', brand: 'Asus', name: 'ZenBook 14 UX3402', cpu: 'i5-1240P', ram: '16GB', color: '#4f46e5', accent: '#312e81', tag: 'Cao Cấp' },
  { slug: 'asus-tuf-f15', brand: 'Asus', name: 'TUF Gaming F15 FX506', cpu: 'i5-11400H', ram: '8GB', color: '#ea580c', accent: '#9a3412', tag: 'Gaming' },
  { slug: 'asus-vivobook-15', brand: 'Asus', name: 'VivoBook 15 X1502', cpu: 'i3-1215U', ram: '8GB', color: '#14b8a6', accent: '#115e59', tag: 'Sinh Viên' },

  // ===== Lenovo =====
  { slug: 'lenovo-thinkpad-e14', brand: 'Lenovo', name: 'ThinkPad E14 Gen 4', cpu: 'i5-1235U', ram: '16GB', color: '#dc2626', accent: '#7f1d1d', tag: 'Doanh Nhân' },
  { slug: 'lenovo-legion-5', brand: 'Lenovo', name: 'Legion 5 Pro 16', cpu: 'i7-12700H', ram: '16GB', color: '#16a34a', accent: '#14532d', tag: 'Gaming' },
  { slug: 'lenovo-ideapad-3', brand: 'Lenovo', name: 'IdeaPad 3 15IAU7', cpu: 'i5-1235U', ram: '8GB', color: '#0891b2', accent: '#155e75', tag: 'Văn Phòng' },
  { slug: 'lenovo-yoga-slim-7', brand: 'Lenovo', name: 'Yoga Slim 7 Pro', cpu: 'R7-6800HS', ram: '16GB', color: '#6366f1', accent: '#3730a3', tag: 'Cao Cấp' },

  // ===== Apple =====
  { slug: 'macbook-air-m1', brand: 'Apple', name: 'MacBook Air M1 2020', cpu: 'Apple M1', ram: '8GB', color: '#94a3b8', accent: '#475569', tag: 'Phổ Biến' },
  { slug: 'macbook-pro-14-m2', brand: 'Apple', name: 'MacBook Pro 14 M2', cpu: 'Apple M2 Pro', ram: '16GB', color: '#71717a', accent: '#3f3f46', tag: 'Chuyên Nghiệp' },
  { slug: 'macbook-air-m3', brand: 'Apple', name: 'MacBook Air 15 M3', cpu: 'Apple M3', ram: '16GB', color: '#a3a3a3', accent: '#525252', tag: 'Mới Nhất' },

  // ===== MSI =====
  { slug: 'msi-gaming-katana', brand: 'MSI', name: 'Katana GF66 12UE', cpu: 'i7-12700H', ram: '16GB', color: '#be123c', accent: '#881337', tag: 'Gaming' },
  { slug: 'msi-prestige-14', brand: 'MSI', name: 'Prestige 14 Evo', cpu: 'i7-13700H', ram: '16GB', color: '#0f766e', accent: '#134e4a', tag: 'Sáng Tạo' },

  // ===== Acer =====
  { slug: 'acer-aspire-5', brand: 'Acer', name: 'Aspire 5 A514-55', cpu: 'i5-1235U', ram: '8GB', color: '#65a30d', accent: '#3f6212', tag: 'Phổ Thông' },
  { slug: 'acer-nitro-5', brand: 'Acer', name: 'Nitro 5 AN515-58', cpu: 'i5-12500H', ram: '16GB', color: '#ea580c', accent: '#7c2d12', tag: 'Gaming' },

  // ===== LG Gram =====
  { slug: 'lg-gram-16', brand: 'LG', name: 'Gram 16Z90R', cpu: 'i7-1360P', ram: '16GB', color: '#c026d3', accent: '#86198f', tag: 'Mỏng Nhẹ' },

  // ===== Razer =====
  { slug: 'razer-blade-15', brand: 'Razer', name: 'Blade 15 Advanced', cpu: 'i7-13800H', ram: '32GB', color: '#22c55e', accent: '#14532d', tag: 'Cao Cấp' }
];

function generateSVG(product) {
  const { slug, brand, name, cpu, ram, color, accent, tag } = product;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bg-${slug}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="laptop-${slug}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="screen-${slug}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="glow-${slug}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow-${slug}">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="800" height="600" fill="url(#bg-${slug})"/>
  <circle cx="400" cy="300" r="280" fill="url(#glow-${slug})"/>

  <!-- Decorative grid -->
  <g opacity="0.08">
    <line x1="0" y1="200" x2="800" y2="200" stroke="white" stroke-width="1"/>
    <line x1="0" y1="300" x2="800" y2="300" stroke="white" stroke-width="1"/>
    <line x1="0" y1="400" x2="800" y2="400" stroke="white" stroke-width="1"/>
    <line x1="200" y1="0" x2="200" y2="600" stroke="white" stroke-width="1"/>
    <line x1="400" y1="0" x2="400" y2="600" stroke="white" stroke-width="1"/>
    <line x1="600" y1="0" x2="600" y2="600" stroke="white" stroke-width="1"/>
  </g>

  <!-- Laptop shadow -->
  <ellipse cx="400" cy="500" rx="280" ry="20" fill="black" opacity="0.3" filter="url(#shadow-${slug})"/>

  <!-- Laptop base (hinge/keyboard area) -->
  <path d="M 160 470 L 640 470 L 660 490 L 140 490 Z" fill="url(#laptop-${slug})"/>
  <rect x="140" y="488" width="520" height="4" rx="2" fill="#475569"/>

  <!-- Laptop screen (slightly tilted view) -->
  <rect x="170" y="190" width="460" height="285" rx="14" fill="#0f172a"/>
  <rect x="178" y="198" width="444" height="269" rx="8" fill="url(#screen-${slug})"/>

  <!-- Screen content: brand name + spec callouts -->
  <rect x="198" y="218" width="180" height="20" rx="4" fill="white" opacity="0.95"/>
  <text x="288" y="234" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="${color}" text-anchor="middle">${brand.toUpperCase()}</text>

  <text x="198" y="280" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="white">${name}</text>

  <!-- Spec chip 1: CPU -->
  <rect x="198" y="320" width="180" height="46" rx="10" fill="white" fill-opacity="0.95"/>
  <text x="208" y="345" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="${accent}" letter-spacing="1">CPU</text>
  <text x="208" y="360" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#0f172a">${cpu}</text>

  <!-- Spec chip 2: RAM -->
  <rect x="392" y="320" width="180" height="46" rx="10" fill="white" fill-opacity="0.95"/>
  <text x="402" y="345" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="${accent}" letter-spacing="1">RAM</text>
  <text x="402" y="360" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#0f172a">${ram}</text>

  <!-- Tag badge -->
  <rect x="500" y="218" width="100" height="32" rx="16" fill="white"/>
  <text x="550" y="240" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${color}" text-anchor="middle">${tag}</text>

  <!-- Webcam dot -->
  <circle cx="400" cy="207" r="2" fill="#0f172a"/>
  <circle cx="400" cy="207" r="0.5" fill="${color}"/>

  <!-- Bottom strip with hi-tech pattern -->
  <rect x="178" y="430" width="444" height="2" fill="white" opacity="0.3"/>
  <g opacity="0.5">
    <rect x="198" y="445" width="40" height="3" fill="white"/>
    <rect x="248" y="445" width="60" height="3" fill="white"/>
    <rect x="318" y="445" width="30" height="3" fill="white"/>
  </g>
</svg>`;
}

function generateFallback() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="fb-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#fb-bg)"/>
  <circle cx="400" cy="300" r="100" fill="#334155"/>
  <text x="400" y="320" font-family="Arial, sans-serif" font-size="60" font-weight="800" fill="#64748b" text-anchor="middle">?</text>
  <text x="400" y="380" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#94a3b8" text-anchor="middle">No Image Available</text>
</svg>`;
}

function generatePlaceholder(category) {
  const config = {
    laptop: { color: '#06b6d4', label: 'LAPTOP' },
    gaming: { color: '#a855f7', label: 'GAMING' },
    macbook: { color: '#71717a', label: 'MACBOOK' },
    components: { color: '#10b981', label: 'LINH KIỆN' }
  };
  const { color, label } = config[category] || config.laptop;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#0f172a"/>
  <rect x="0" y="0" width="800" height="600" fill="${color}" fill-opacity="0.15"/>
  <text x="400" y="320" font-family="Arial, sans-serif" font-size="80" font-weight="900" fill="${color}" text-anchor="middle">${label}</text>
</svg>`;
}

let created = 0;
PRODUCTS.forEach(p => {
  const file = path.join(OUTPUT_DIR, `${p.slug}.svg`);
  fs.writeFileSync(file, generateSVG(p), 'utf8');
  created++;
});

const fallbackDir = path.join(__dirname, '..', 'public', 'images', 'fallback');
if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
fs.writeFileSync(path.join(fallbackDir, 'no-image.svg'), generateFallback(), 'utf8');

const categoryDir = path.join(__dirname, '..', 'public', 'images', 'categories');
['laptop', 'gaming', 'macbook', 'components'].forEach(cat => {
  fs.writeFileSync(path.join(categoryDir, `${cat}.svg`), generatePlaceholder(cat), 'utf8');
});

console.log(`✓ Created ${created} product images`);
console.log(`✓ Created fallback + category placeholders`);
console.log(`✓ Location: ${OUTPUT_DIR}`);
