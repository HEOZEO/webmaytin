/**
 * Migration utilities — fix legacy URLs cached in localStorage/sessionStorage.
 *
 * Older versions stored absolute Unsplash URLs in cart/wishlist/profile data.
 * After we migrated DB to use local /images/products/*.jpg paths, those cached
 * entries still point to dead Unsplash URLs and show broken images.
 *
 * Run once on app boot to clean old broken image_url entries.
 */

const BROKEN_PATTERNS = [
  /^https?:\/\/images\.unsplash\.com\//i,
  /^https?:\/\/via\.placeholder\.com\//i,
  /^https?:\/\/placehold\.co\//i,
  /^https?:\/\/.*\.cloudfront\.net\/.*unsplash/i,
];

const STORAGE_KEYS = ['cart', 'wishlist', 'compare', 'recentlyViewed', 'guestCart'];

function isLegacyImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return BROKEN_PATTERNS.some(re => re.test(url));
}

function sanitizeImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!isLegacyImageUrl(url)) return url;
  return '/images/fallback/no-image.svg';
}

function migrateItem(item) {
  if (!item || typeof item !== 'object') return item;
  if (isLegacyImageUrl(item.image_url)) item.image_url = sanitizeImageUrl(item.image_url);
  if (isLegacyImageUrl(item.product_image)) item.product_image = sanitizeImageUrl(item.product_image);
  return item;
}

/**
 * Walk every known storage key and replace broken image URLs with the local
 * fallback. Safe to call repeatedly.
 */
export function runLegacyUrlMigration() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  for (const key of STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const cleaned = cleanRecursive(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(cleaned)) {
        window.localStorage.setItem(key, JSON.stringify(cleaned));
        // eslint-disable-next-line no-console
        console.log(`[legacy-url-migration] cleaned '${key}'`);
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
}

function cleanRecursive(value) {
  if (Array.isArray(value)) return value.map(cleanRecursive);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = cleanRecursive(value[k]);
    return migrateItem(out);
  }
  return value;
}