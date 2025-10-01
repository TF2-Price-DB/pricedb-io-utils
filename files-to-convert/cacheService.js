const { clearTimeout, setTimeout } = require('timers');

const logger = require('../logger');

const configService = require('./configService');

/**
 * In-memory caching service for expensive API endpoints
 * Simple alternative to Redis without external dependencies
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    const cacheConfig = configService.getCacheConfig();
    this.defaultTTL = cacheConfig.defaultTTL;
    this.maxSize = cacheConfig.maxSize;
    logger.info('In-memory cache service initialized', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
    });
  }

  /**
   * Initialize cache service (no-op for in-memory implementation)
   */
  async init() {
    // No initialization needed for in-memory cache
    logger.info('In-memory cache service ready');
  }

  /**
   * Clean up expired entries and enforce size limit
   */
  _cleanup() {
    // Remove expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.cache.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }
    }

    // Enforce size limit by removing oldest entries
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].created - b[1].created);

      const toRemove = entries.slice(0, this.cache.size - this.maxSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  async get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(key, data, ttl = this.defaultTTL) {
    const now = Date.now();
    const expires = ttl > 0 ? now + ttl * 1000 : null;

    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Set the cache entry
    this.cache.set(key, {
      data,
      created: now,
      expires,
    });

    // Set expiration timer if TTL is specified
    if (expires) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);

      this.timers.set(key, timer);
    }

    // Periodic cleanup
    if (Math.random() < 0.1) {
      // 10% chance on each set
      this._cleanup();
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   */
  async del(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();
    logger.info('In-memory cache cleared');
  }

  /**
   * Generate cache key for API endpoints
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @returns {string} Cache key
   */
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    const paramString =
      Object.keys(sortedParams).length > 0 ? `:${JSON.stringify(sortedParams)}` : '';

    return `api:${endpoint}${paramString}`;
  }

  /**
   * Wrapper for caching expensive database queries
   * @param {string} key - Cache key
   * @param {Function} queryFn - Function that returns the data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fresh data
   */
  async getOrSet(key, queryFn, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute the query
    try {
      const data = await queryFn();
      // Cache the result
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      logger.error(`Error executing query for cache key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      timers: this.timers.size,
    };
  }
}

module.exports = new CacheService();
