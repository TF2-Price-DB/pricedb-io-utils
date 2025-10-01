const { validationResult } = require('express-validator');

const logger = require('../logger');

/**
 * Base API controller with common functionality
 */
class BaseController {
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
   * Send success response
   * @param {object} res - Express response object
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   * @param {object} metadata - Additional metadata
   */
  static sendSuccess(res, data, statusCode = 200, metadata = {}) {
    const response = {
      success: true,
      data,
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

    // Log error for debugging
    logger.error(`API Error: ${message}`, {
      statusCode,
      details,
      stack: details.stack,
    });

    res.status(statusCode).json(response);
  }

  /**
   * Validate request input
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {boolean} True if validation passes
   */
  static validateInput(req, res, _next) {
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
  static handleDbError(res, error, operation = 'database operation') {
    logger.error(`Database error during ${operation}`, {
      error: error.message,
      stack: error.stack,
    });

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
  static sendNotFound(res, resource = 'Resource') {
    BaseController.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Handle validation errors
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
   * @returns {object} Pagination parameters
   */
  static parsePagination(query) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Generate cache key for requests
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @returns {string} Cache key
   */
  static generateCacheKey(endpoint, params = {}) {
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
  static errorHandler(error, req, res, _next) {
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
}

module.exports = BaseController;
