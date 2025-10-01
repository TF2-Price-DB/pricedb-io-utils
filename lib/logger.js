/**
 * Configurable logging service without database dependencies
 * @class Logger
 */
class Logger {
  constructor(options = {}) {
    this.levels = {
      debug: { name: 'DEBUG', priority: 0 },
      info: { name: 'INFO', priority: 1 },
      warn: { name: 'WARN', priority: 2 },
      error: { name: 'ERROR', priority: 3 },
    };

    // Default configuration
    this._config = {
      level: 'info',
      enableConsole: true,
      enableFile: false,
      filePath: null,
      format: 'json', // 'json' or 'simple'
      includeTimestamp: true,
      includeLevel: true,
      customHandler: null,
      ...options,
    };

    this._fs = null;
    this._path = null;

    // Initialize file system modules if file logging is enabled
    if (this._config.enableFile) {
      this._initializeFileLogging();
    }
  }

  /**
   * Initialize file system modules for file logging
   * @private
   */
  _initializeFileLogging() {
    try {
      this._fs = require('fs');
      this._path = require('path');

      if (this._config.filePath) {
        // Ensure directory exists
        const dir = this._path.dirname(this._config.filePath);
        if (!this._fs.existsSync(dir)) {
          this._fs.mkdirSync(dir, { recursive: true });
        }
      }
    } catch (error) {
      console.warn(`File logging disabled: Unable to load fs/path modules - ${error.message}`);
      this._config.enableFile = false;
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
    const oldFileConfig = this._config.enableFile;
    this._config = { ...this._config, ...options };

    // If file logging was enabled, initialize it
    if (this._config.enableFile && !oldFileConfig) {
      this._initializeFileLogging();
    }
  }

  /**
   * Set log level
   * @param {string} level - Log level (debug, info, warn, error)
   */
  setLevel(level) {
    if (this.levels[level]) {
      this._config.level = level;
    } else {
      throw new Error(
        `Invalid log level: ${level}. Valid levels: ${Object.keys(this.levels).join(', ')}`
      );
    }
  }

  /**
   * Get current log level
   * @returns {string} Current log level
   */
  getLevel() {
    return this._config.level;
  }

  /**
   * Enable/disable console logging
   * @param {boolean} enabled - Whether console logging is enabled
   */
  setConsoleEnabled(enabled) {
    this._config.enableConsole = enabled;
  }

  /**
   * Enable/disable file logging
   * @param {boolean} enabled - Whether file logging is enabled
   * @param {string} filePath - Optional file path for logging
   */
  setFileEnabled(enabled, filePath = null) {
    this._config.enableFile = enabled;
    if (filePath) {
      this._config.filePath = filePath;
    }

    if (enabled) {
      this._initializeFileLogging();
    }
  }

  /**
   * Set custom log handler
   * @param {Function} handler - Custom handler function(level, message, metadata)
   */
  setCustomHandler(handler) {
    if (typeof handler === 'function') {
      this._config.customHandler = handler;
    } else {
      this._config.customHandler = null;
    }
  }

  /**
   * Check if a log level should be processed
   * @param {string} level - Log level to check
   * @returns {boolean} Whether the level should be logged
   * @private
   */
  _shouldLog(level) {
    const currentLevel = this.levels[this._config.level];
    const targetLevel = this.levels[level];
    return targetLevel && targetLevel.priority >= currentLevel.priority;
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   * @returns {string} Formatted message
   * @private
   */
  _formatMessage(level, message, metadata) {
    const timestamp = this._config.includeTimestamp ? new Date().toISOString() : null;
    const logLevel = this._config.includeLevel
      ? this.levels[level]?.name || level.toUpperCase()
      : null;

    if (this._config.format === 'json') {
      const logEntry = {
        ...(timestamp && { timestamp }),
        ...(logLevel && { level: logLevel }),
        message,
        ...(Object.keys(metadata).length > 0 && { metadata }),
      };
      return JSON.stringify(logEntry);
    } else {
      // Simple format
      const parts = [];
      if (timestamp) {
        parts.push(`[${timestamp}]`);
      }
      if (logLevel) {
        parts.push(`[${logLevel}]`);
      }
      parts.push(message);

      if (Object.keys(metadata).length > 0) {
        parts.push(`- ${JSON.stringify(metadata)}`);
      }

      return parts.join(' ');
    }
  }

  /**
   * Write log to file
   * @param {string} formattedMessage - Formatted log message
   * @private
   */
  _writeToFile(formattedMessage) {
    if (this._config.enableFile && this._config.filePath && this._fs) {
      try {
        this._fs.appendFileSync(this._config.filePath, formattedMessage + '\n');
      } catch (error) {
        console.warn('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * Core logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  log(level, message, metadata = {}) {
    if (!this._shouldLog(level)) {
      return;
    }

    const formattedMessage = this._formatMessage(level, message, metadata);

    // Console output
    if (this._config.enableConsole) {
      let consoleMethod;
      if (level === 'error') {
        consoleMethod = 'error';
      } else if (level === 'warn') {
        consoleMethod = 'warn';
      } else {
        consoleMethod = 'log';
      }
      console[consoleMethod](formattedMessage);
    }

    // File output
    this._writeToFile(formattedMessage);

    // Custom handler
    if (this._config.customHandler) {
      try {
        this._config.customHandler(level, message, metadata);
      } catch (error) {
        console.warn('Custom log handler failed:', error.message);
      }
    }
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
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
   * Create a child logger with default metadata
   * @param {object} defaultMetadata - Default metadata for all logs
   * @returns {object} Child logger
   */
  child(defaultMetadata = {}) {
    const parent = this;
    return {
      debug: (message, metadata = {}) => parent.debug(message, { ...defaultMetadata, ...metadata }),
      info: (message, metadata = {}) => parent.info(message, { ...defaultMetadata, ...metadata }),
      warn: (message, metadata = {}) => parent.warn(message, { ...defaultMetadata, ...metadata }),
      error: (message, metadata = {}) => parent.error(message, { ...defaultMetadata, ...metadata }),
      log: (level, message, metadata = {}) =>
        parent.log(level, message, { ...defaultMetadata, ...metadata }),
    };
  }

  /**
   * Create a timer for measuring execution time
   * @param {string} name - Timer name
   * @returns {object} Timer object with end() method
   */
  timer(name) {
    const start = Date.now();
    return {
      end: (message = `${name} completed`, metadata = {}) => {
        const duration = Date.now() - start;
        this.info(message, { ...metadata, duration: `${duration}ms` });
        return duration;
      },
    };
  }
}

module.exports = Logger;
