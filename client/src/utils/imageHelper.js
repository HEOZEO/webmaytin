/**
 * Image utility helpers - Same-origin static asset handling
 *
 * Always use RELATIVE paths for `/images/*` and `/uploads/*` so the request
 * is same-origin with the page that loaded the SPA. This avoids:
 *   - `Cross-Origin-Resource-Policy: same-origin` (helmet default) blocking
 *     cross-origin `<img>` loads
 *   - CORS preflight for cross-port requests (Vite dev proxy)
 *   - LAN/mobile devices failing to reach `localhost:5000` (they only reach
 *     `5173` / Nginx)
 *
 * Routing (handled transparently):
 *   - Dev:    Vite proxy forwards `/api`, `/images`, `/uploads` → `:5000`
 *   - Prod:   Nginx reverse-proxies the same paths → backend
 *   - LAN:    Same — proxy is host-agnostic (`:5173` or `:80`)
 */

export const FALLBACK_IMAGE = '/images/fallback/no-image.svg';

// Track errored URLs in-session so we don't re-trigger network requests for
// known-broken images on every re-render. Cleared on full page reload.
const _brokenImageUrls = new Set();

/**
 * Resolve image URL:
 * - empty/null → fallback
 * - http(s)/data: → use as-is (external CDN, base64)
 * - `/images/...` or `/uploads/...` → return AS-IS (same-origin, proxied)
 * - bare filename like `foo.jpg` → resolve as `/images/products/foo.jpg`
 */
export function resolveImage(imageUrl) {
  if (!imageUrl) return FALLBACK_IMAGE;

  // Already absolute URL or base64
  if (/^(https?:|data:)/i.test(imageUrl)) return imageUrl;

  // Strip query/hash just in case
  let path = imageUrl.split('?')[0].split('#')[0];

  // Prepend leading slash
  if (!path.startsWith('/')) path = '/' + path;

  // Keep relative — Vite dev proxy (localhost:5173 → 5000) and Nginx prod
  // both forward /images and /uploads to the backend. Browser sees a
  // same-origin request, no CORS / CORP block.
  return path;
}

/**
 * Same as resolveImage but adds a `?v=<timestamp>` cache-buster when caller
 * wants to force re-fetch (e.g. after admin upload). Default off.
 */
export function resolveImageFresh(imageUrl) {
  const url = resolveImage(imageUrl);
  if (!url || url === FALLBACK_IMAGE || /^data:/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${Date.now()}`;
}

/**
 * Convert local path to absolute URL using the backend origin (port 5000).
 * Use only when same-origin is NOT possible (e.g. serving an image from
 * another tab, email links, etc.). For `<img>` tags inside the SPA, prefer
 * `resolveImage()` which keeps the path relative.
 */
export function getBackendUrl(localPath) {
  if (!localPath) return FALLBACK_IMAGE;
  if (/^(https?:|data:)/i.test(localPath)) return localPath;
  const cleanPath = localPath.startsWith('/') ? localPath : `/${localPath}`;
  if (typeof window === 'undefined') return `http://localhost:5000${cleanPath}`;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000${cleanPath}`;
}

/**
 * onError handler: replace broken image with fallback. Removes infinite-loop
 * risk by checking current src against fallback and skipping already-failed
 * images that map to /uploads (just hide them — uploads are user content and
 * hiding them is safer than spamming the fallback slot).
 */
export function onImageError(event) {
  const img = event && event.currentTarget;
  if (!img) return;
  const src = img.src || '';

  // If we've already replaced once → nothing more to do.
  if (_brokenImageUrls.has(src)) {
    img.style.display = 'none';
    return;
  }

  if (src !== window.location.origin + FALLBACK_IMAGE && !src.endsWith(FALLBACK_IMAGE)) {
    _brokenImageUrls.add(src);
    img.src = FALLBACK_IMAGE;
    img.onerror = () => {
      // Even fallback failed → hide entirely
      img.style.display = 'none';
    };
  } else {
    img.style.display = 'none';
  }
}