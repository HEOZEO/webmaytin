const cacheStore = new Map();
const MAX_CACHE_ENTRIES = 1000; // hard cap to prevent unbounded memory growth

const getCacheKey = (prefix, key) => `${prefix}:${key}`;

exports.getCache = (prefix, key) => {
  const cacheKey = getCacheKey(prefix, key);
  const entry = cacheStore.get(cacheKey);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(cacheKey);
    return null;
  }

  return entry.value;
};

exports.setCache = (prefix, key, value, ttlSeconds = 60) => {
  const cacheKey = getCacheKey(prefix, key);

  // Evict oldest entries (Map iteration order = insertion order)
  while (cacheStore.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cacheStore.keys().next().value;
    if (!firstKey) break;
    cacheStore.delete(firstKey);
  }

  cacheStore.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
};

exports.invalidateCache = (prefix, key) => {
  if (key === undefined) {
    for (const cacheKey of Array.from(cacheStore.keys())) {
      if (cacheKey.startsWith(`${prefix}:`)) cacheStore.delete(cacheKey);
    }
    return;
  }

  cacheStore.delete(getCacheKey(prefix, key));
};
