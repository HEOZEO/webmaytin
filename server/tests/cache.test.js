// Test cache utility - verify LRU-like eviction (audit H-13).

jest.mock('../config/database', () => ({
  pool: {},
  connectDatabase: jest.fn()
}));

const cache = require('../utils/cache');

describe('Cache utility', () => {
  beforeEach(() => {
    cache.invalidateCache();  // Clear all
  });

  test('set and get a value', () => {
    cache.setCache('test', 'key1', { foo: 'bar' }, 60);
    expect(cache.getCache('test', 'key1')).toEqual({ foo: 'bar' });
  });

  test('returns null for missing key', () => {
    expect(cache.getCache('test', 'missing')).toBeNull();
  });

  test('returns null for expired key', () => {
    cache.setCache('test', 'key1', 'value', 0);  // 0 seconds TTL
    // Wait for natural expiry
    return new Promise(resolve => {
      setTimeout(() => {
        expect(cache.getCache('test', 'key1')).toBeNull();
        resolve();
      }, 50);
    });
  });

  test('invalidateCache with key removes specific entry', () => {
    cache.setCache('test', 'a', 1, 60);
    cache.setCache('test', 'b', 2, 60);
    cache.invalidateCache('test', 'a');
    expect(cache.getCache('test', 'a')).toBeNull();
    expect(cache.getCache('test', 'b')).toBe(2);
  });

  test('invalidateCache without key removes entire prefix', () => {
    cache.setCache('users', 'a', 1, 60);
    cache.setCache('users', 'b', 2, 60);
    cache.setCache('products', 'x', 'X', 60);
    cache.invalidateCache('users');
    expect(cache.getCache('users', 'a')).toBeNull();
    expect(cache.getCache('users', 'b')).toBeNull();
    expect(cache.getCache('products', 'x')).toBe('X');
  });

  test('respects MAX_CACHE_ENTRIES limit (LRU-like eviction)', () => {
    // The cap is 1000 - test by exceeding
    const PREFIX = 'lrutest';
    for (let i = 0; i < 1100; i++) {
      cache.setCache(PREFIX, `k${i}`, i, 60);
    }
    // Old entries should be evicted
    expect(cache.getCache(PREFIX, 'k0')).toBeNull();
    expect(cache.getCache(PREFIX, 'k1')).toBeNull();
    // Recent entries should still be there
    expect(cache.getCache(PREFIX, 'k1099')).toBe(1099);
    expect(cache.getCache(PREFIX, 'k1050')).toBe(1050);
  });
});
