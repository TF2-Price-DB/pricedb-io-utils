const { validationResult } = require('express-validator');

/**
 * Base API controller with common functionality
 * Provides standard methods for handling responses, errors, and validation
 * @class BaseController
 */
class BaseController {
  constructor(options = {}) {
    this._config = {
      enableLogging: false,
      logger: null,
      includeStackTrace: process.env.NODE_ENV === 'development',
      defaultPaginationLimit: 10,
      maxPaginationLimit: 100,
      ...options,
    };
  }

  /**
   * Set configuration options
   * @param {object} options - Configuration options
   */
  setConfig(options) {
    this._config = { ...this._config, ...options };
  }

  /**
   * Get current configuration
   * @returns {object} Current configuration
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Set logger instance
   * @param {object} logger - Logger instance
   */
  setLogger(logger) {
    this._config.logger = logger;
    this._config.enableLogging = true;
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
   * Handle async route functions with error catching
   * @param {Function} fn - Async route handler function
   * @returns {Function} Express middleware function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Instance version of asyncHandler
   * @param {Function} fn - Async route handler function
   * @returns {Function} Express middleware function
   */
  asyncHandler(fn) {
    return BaseController.asyncHandler(fn);
  }

  /**
   * Send success response
   * @param {object} res - Express response object
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   * @param {object} metadata - Additional metadata
   */
  sendSuccess(res, data, statusCode = 200, metadata = {}) {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this._log('debug', 'Success response sent', {
      statusCode,
      dataType: typeof data,
      hasMetadata: Object.keys(metadata).length > 0,
    });

    res.status(statusCode).json(response);
  }

  /**
   * Static version of sendSuccess
   * @param {object} res - Express response object
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   * @param {object} metadata - Additional metadata
   */
  static sendSuccess(res, data, statusCode = 200, metadata = {}) {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {object} details - Additional error details
   */
  sendError(res, message, statusCode = 500, details = {}) {
    const response = {
      success: false,
      error: {
        message,
        code: statusCode,
        timestamp: new Date().toISOString(),
        ...details,
      },
    };

    // Include stack trace in development
    if (this._config.includeStackTrace && details.stack) {
      response.error.stack = details.stack;
    }

    // Log error for debugging
    this._log('error', `API Error: ${message}`, {
      statusCode,
      details,
      stack: details.stack,
    });

    res.status(statusCode).json(response);
  }

  /**
   * Static version of sendError
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {object} details - Additional error details
   */
  static sendError(res, message, statusCode = 500, details = {}) {
    const response = {
      success: false,
      error: {
        message,
        code: statusCode,
        timestamp: new Date().toISOString(),
        ...details,
      },
    };

    res.status(statusCode).json(response);
  }

  /**
   * Validate request input
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {boolean} True if validation passes
   */
  validateInput(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      this.sendError(res, 'Validation failed', 400, {
        validationErrors: errors.array(),
      });
      return false;
    }
    return true;
  }

  /**
   * Static version of validateInput
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {boolean} True if validation passes
   */
  static validateInput(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      BaseController.sendError(res, 'Validation failed', 400, {
        validationErrors: errors.array(),
      });
      return false;
    }
    return true;
  }

  /**
   * Handle database errors
   * @param {object} res - Express response object
   * @param {Error} error - Database error
   * @param {string} operation - Operation being performed
   */
  handleDbError(res, error, operation = 'database operation') {
    this._log('error', `Database error during ${operation}`, {
      error: error.message,
      stack: error.stack,
    });

    // Don't expose internal error details in production
    const message = this._config.includeStackTrace ? error.message : 'Database error occurred';

    this.sendError(res, message, 500, {
      operation,
      code: error.code,
      ...(this._config.includeStackTrace && { stack: error.stack }),
    });
  }

  /**
   * Static version of handleDbError
   * @param {object} res - Express response object
   * @param {Error} error - Database error
   * @param {string} operation - Operation being performed
   */
  static handleDbError(res, error, operation = 'database operation') {
    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === 'production' ? 'Database error occurred' : error.message;

    BaseController.sendError(res, message, 500, {
      operation,
      code: error.code,
    });
  }

  /**
   * Handle not found responses
   * @param {object} res - Express response object
   * @param {string} resource - Resource that was not found
   */
  sendNotFound(res, resource = 'Resource') {
    this.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Static version of sendNotFound
   * @param {object} res - Express response object
   * @param {string} resource - Resource that was not found
   */
  static sendNotFound(res, resource = 'Resource') {
    BaseController.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Handle validation errors
   * @param {object} res - Express response object
   * @param {string} message - Validation error message
   * @param {object} details - Validation details
   */
  sendValidationError(res, message, details = {}) {
    this.sendError(res, message, 400, details);
  }

  /**
   * Static version of sendValidationError
   * @param {object} res - Express response object
   * @param {string} message - Validation error message
   * @param {object} details - Validation details
   */
  static sendValidationError(res, message, details = {}) {
    BaseController.sendError(res, message, 400, details);
  }

  /**
   * Parse and validate pagination parameters
   * @param {object} query - Request query parameters
   * @param {object} options - Pagination options
   * @returns {object} Pagination parameters
   */
  parsePagination(query, options = {}) {
    const defaultLimit = options.defaultLimit || this._config.defaultPaginationLimit;
    const maxLimit = options.maxLimit || this._config.maxPaginationLimit;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || defaultLimit.toString(), 10)));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Static version of parsePagination
   * @param {object} query - Request query parameters
   * @param {object} options - Pagination options
   * @returns {object} Pagination parameters
   */
  static parsePagination(query, options = {}) {
    const defaultLimit = options.defaultLimit || 10;
    const maxLimit = options.maxLimit || 100;

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || defaultLimit.toString(), 10)));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Generate cache key for requests
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @returns {string} Cache key
   */
  generateCacheKey(endpoint, params = {}) {
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
   * Static version of generateCacheKey (uses default parameters)
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @returns {string} Cache key
   */
  static generateCacheKey(endpoint, params = {}) {
    // Use a simplified version for static calls
    const paramString = Object.keys(params).length > 0 ? `:${JSON.stringify(params)}` : '';
    return `api:${endpoint}${paramString}`;
  }

  /**
   * Transform database row to API response format
   * @param {object} row - Database row
   * @returns {object} Formatted response
   */
  static transformPriceData(row) {
    return {
      name: row.name,
      sku: row.sku,
      source: row.source,
      time: row.time,
      buy: {
        keys: Number(row.buy_keys) || 0,
        metal: Number(row.buy_metal) || 0,
      },
      sell: {
        keys: Number(row.sell_keys) || 0,
        metal: Number(row.sell_metal) || 0,
      },
    };
  }

  /**
   * Middleware for handling common errors
   * @param {Error} error - Error object
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {Function} next - Express next function
   */
  errorHandler(error, req, res, next) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      this.sendValidationError(res, error.message, error.details);
    } else if (error.code === '23505') {
      // PostgreSQL unique violation
      this.sendError(res, 'Duplicate entry', 409);
    } else if (error.code === '23503') {
      // PostgreSQL foreign key violation
      this.sendError(res, 'Referenced record not found', 400);
    } else if (error.code === 'ECONNREFUSED') {
      this.sendError(res, 'Service temporarily unavailable', 503);
    } else {
      this.sendError(res, 'Internal server error', 500, {
        error: this._config.includeStackTrace ? error.message : undefined,
        stack: this._config.includeStackTrace ? error.stack : undefined,
      });
    }
  }

  /**
   * Static version of errorHandler middleware
   * @param {Error} error - Error object
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {Function} next - Express next function
   */
  static errorHandler(error, req, res, next) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      BaseController.sendValidationError(res, error.message, error.details);
    } else if (error.code === '23505') {
      // PostgreSQL unique violation
      BaseController.sendError(res, 'Duplicate entry', 409);
    } else if (error.code === '23503') {
      // PostgreSQL foreign key violation
      BaseController.sendError(res, 'Referenced record not found', 400);
    } else if (error.code === 'ECONNREFUSED') {
      BaseController.sendError(res, 'Service temporarily unavailable', 503);
    } else {
      BaseController.sendError(res, 'Internal server error', 500, {
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Create middleware for rate limiting using cache
   * @param {object} cache - Cache instance
   * @param {object} options - Rate limiting options
   * @returns {Function} Express middleware
   */
  createRateLimit(cache, options = {}) {
    const config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: (req) => req.ip || req.connection.remoteAddress,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };

    return async (req, res, next) => {
      try {
        const key = `rateLimit:${config.keyGenerator(req)}`;
        const current = await cache.get(key) || 0;
        
        if (current >= config.maxRequests) {
          return this.sendError(res, 'Too many requests', 429, {
            retryAfter: Math.ceil(config.windowMs / 1000),
          });
        }

        await cache.set(key, current + 1, Math.ceil(config.windowMs / 1000));
        next();
      } catch (error) {
        // If rate limiting fails, continue (don't block requests)
        this._log('warn', 'Rate limiting failed', { error: error.message });
        next();
      }
    };
  }
}

module.exports = BaseController;