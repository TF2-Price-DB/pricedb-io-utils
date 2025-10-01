const configService = require('./services/configService');

/**
 * Logging service with database integration
 */
class Logger {
  constructor() {
    this.levels = {
      info: 'INFO',
      warn: 'WARN',
      error: 'ERROR',
    };
    this.config = configService.getLoggingConfig();
    this.db = null;
    this._initializeDb();
  }

  /**
   * Initialize database connection for logging
   * @private
   */
  _initializeDb() {
    // Lazy load db to avoid circular dependency
    setTimeout(() => {
      try {
        const db = require('./db');
        this.db = db;
      } catch (error) {
        console.warn('Database logging disabled:', error.message);
      }
    }, 100);
  }

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logLevel = this.levels[level] || 'INFO';
    const logLine = `[${timestamp}] [${logLevel}] ${message}`;

    // Console output
    console.log(logLine);

    // Add metadata if provided
    if (Object.keys(metadata).length > 0) {
      console.log('Metadata:', JSON.stringify(metadata, null, 2));
    }

    // Database logging (async, non-blocking)
    if (this.config.enableDbLogging && this.db) {
      this._logToDatabase(timestamp, level, message, metadata).catch((error) => {
        console.warn('Failed to log to database:', error.message);
      });
    }
  }

  /**
   * Log to database
   * @param {string} timestamp - Timestamp
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   * @private
   */
  async _logToDatabase(timestamp, level, message, metadata) {
    try {
      // First try with metadata column (new schema)
      const queryWithMetadata = `
        INSERT INTO ${this.db.schema}.audit_log 
        (timestamp, level, message, metadata) 
        VALUES ($1, $2, $3, $4)
      `;

      await this.db.query(queryWithMetadata, [
        timestamp,
        level,
        message,
        Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      ]);
    } catch {
      try {
        // Fall back to old schema without metadata column
        const queryWithoutMetadata = `
          INSERT INTO ${this.db.schema}.audit_log 
          (timestamp, level, message) 
          VALUES ($1, $2, $3)
        `;

        await this.db.query(queryWithoutMetadata, [timestamp, level, message]);
      } catch {
        // Fail silently to avoid infinite logging loops
      }
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  error(message, metadata = {}) {
    this.log('error', message, metadata);
  }

  /**
   * Log with custom level
   * @param {string} level - Custom log level
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  custom(level, message, metadata = {}) {
    this.log(level, message, metadata);
  }

  /**
   * Create a child logger with default metadata
   * @param {object} defaultMetadata - Default metadata for all logs
   * @returns {object} Child logger
   */
  child(defaultMetadata = {}) {
    return {
      info: (message, metadata = {}) => this.info(message, { ...defaultMetadata, ...metadata }),
      warn: (message, metadata = {}) => this.warn(message, { ...defaultMetadata, ...metadata }),
      error: (message, metadata = {}) => this.error(message, { ...defaultMetadata, ...metadata }),
    };
  }
}

// Export singleton instance
module.exports = new Logger();
