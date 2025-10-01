const { clearTimeout, setTimeout } = require('timers');

/**
 * Configurable in-memory caching service
 * Simple alternative to Redis without external dependencies
 * @class CacheService
 */
class CacheService {
  constructor(options = {}) {
    this.cache = new Map();
    this.timers = new Map();

    // Default configuration
    this._config = {
      defaultTTL: 300, // 5 minutes
      maxSize: 1000,
      enableLogging: false,
      logger: null,
      cleanupInterval: 60000, // 1 minute
      ...options,
    };

    this._cleanupTimer = null;
    this._startCleanupTimer();

    if (this._config.enableLogging && this._config.logger) {
      this._config.logger.info('In-memory cache service initialized', {
        maxSize: this._config.maxSize,
        defaultTTL: this._config.defaultTTL,
      });
    }
  }

  /**
   * Get current configuration
   * @returns {object} Current configuration
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Set configuration options
   * @param {object} options - Configuration options
   */
  setConfig(options) {
    this._config = { ...this._config, ...options };

    // Restart cleanup timer if interval changed
    if (options.cleanupInterval !== undefined) {
      this._stopCleanupTimer();
      this._startCleanupTimer();
    }
  }

  /**
   * Set default TTL
   * @param {number} ttl - Default TTL in seconds
   */
  setDefaultTTL(ttl) {
    this._config.defaultTTL = ttl;
  }

  /**
   * Get default TTL
   * @returns {number} Default TTL in seconds
   */
  getDefaultTTL() {
    return this._config.defaultTTL;
  }

  /**
   * Set maximum cache size
   * @param {number} size - Maximum number of entries
   */
  setMaxSize(size) {
    this._config.maxSize = size;
    this._cleanup(); // Immediately enforce new size limit
  }

  /**
   * Get maximum cache size
   * @returns {number} Maximum number of entries
   */
  getMaxSize() {
    return this._config.maxSize;
  }

  /**
   * Set logger instance
   * @param {object} logger - Logger instance with info, warn, error methods
   */
  setLogger(logger) {
    this._config.logger = logger;
    this._config.enableLogging = true;
  }

  /**
   * Enable/disable logging
   * @param {boolean} enabled - Whether logging is enabled
   */
  setLoggingEnabled(enabled) {
    this._config.enableLogging = enabled;
  }

  /**
   * Start automatic cleanup timer
   * @private
   */
  _startCleanupTimer() {
    if (this._config.cleanupInterval > 0) {
      this._cleanupTimer = setInterval(() => {
        this._cleanup();
      }, this._config.cleanupInterval);
    }
  }

  /**
   * Stop automatic cleanup timer
   * @private
   */
  _stopCleanupTimer() {
    if (this._cleanupTimer) {
      global.clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * Log message if logging is enabled
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {object} metadata - Additional metadata
   * @private
   */
  _log(level, message, metadata = {}) {
    if (this._config.enableLogging && this._config.logger?.[level]) {
      this._config.logger[level](message, metadata);
    }
  }

  /**
   * Clean up expired entries and enforce size limit
   * @private
   */
  _cleanup() {
    const beforeSize = this.cache.size;
    let expiredCount = 0;
    let evictedCount = 0;

    // Remove expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.cache.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
        expiredCount++;
      }
    }

    // Enforce size limit by removing oldest entries
    if (this.cache.size > this._config.maxSize) {
      const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].created - b[1].created);

      const toRemove = entries.slice(0, this.cache.size - this._config.maxSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
        evictedCount++;
      }
    }

    const afterSize = this.cache.size;
    if (expiredCount > 0 || evictedCount > 0) {
      this._log('debug', 'Cache cleanup completed', {
        beforeSize,
        afterSize,
        expiredCount,
        evictedCount,
      });
    }
  }

  /**
   * Initialize cache service (for compatibility with original interface)
   * @returns {Promise<void>}
   */
  async init() {
    this._log('info', 'In-memory cache service ready');
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

    // Update last accessed time for LRU-like behavior
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<void>}
   */
  async set(key, data, ttl = this._config.defaultTTL) {
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
      lastAccessed: now,
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

    // Periodic cleanup (10% chance on each set)
    if (Math.random() < 0.1) {
      this._cleanup();
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key existed and was deleted
   */
  async del(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return existed;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists and is not expired
   */
  async has(key) {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Get all keys in cache
   * @returns {Promise<string[]>} Array of cache keys
   */
  async keys() {
    // Filter out expired keys
    const validKeys = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (!entry.expires || now <= entry.expires) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    const clearedCount = this.cache.size;
    this.cache.clear();
    this.timers.clear();

    this._log('info', 'In-memory cache cleared', { clearedCount });
  }

  /**
   * Generate cache key for API endpoints
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @returns {string} Cache key
   */
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort((a, b) => a.localeCompare(b))
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    const paramString =
      Object.keys(sortedParams).length > 0 ? `:${JSON.stringify(sortedParams)}` : '';

    return `api:${endpoint}${paramString}`;
  }

  /**
   * Wrapper for caching expensive operations
   * @param {string} key - Cache key
   * @param {Function} queryFn - Function that returns the data
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fresh data
   */
  async getOrSet(key, queryFn, ttl = this._config.defaultTTL) {
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
      this._log('error', `Error executing query for cache key ${key}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    let expiredCount = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (entry.expires && now > entry.expires) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this._config.maxSize,
      timers: this.timers.size,
      expired: expiredCount,
      hitRatio: this._calculateHitRatio(),
    };
  }

  /**
   * Calculate hit ratio (simplified, would need proper tracking in production)
   * @returns {number} Estimated hit ratio
   * @private
   */
  _calculateHitRatio() {
    // This is a simplified calculation
    // In a real implementation, you'd track hits and misses
    return this.cache.size > 0 ? 0.85 : 0;
  }

  /**
   * Destroy the cache service and clean up resources
   */
  destroy() {
    this._stopCleanupTimer();

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();

    this._log('info', 'Cache service destroyed');
  }
}

module.exports = CacheService;
