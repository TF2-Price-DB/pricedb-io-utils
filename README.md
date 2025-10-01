# @pricedb/io-utils

A collection of utility classes for Node.js applications including configurable logging, in-memory caching, base controllers for Express.js, and Cloudflare protection middleware.

## Installation

```bash
npm install @pricedb/io-utils
```

## Quick Start

```javascript
const { Logger, CacheService, BaseController, CloudflareProtection } = require('@pricedb/io-utils');

// Or import individual modules
const Logger = require('@pricedb/io-utils/logger');
const CacheService = require('@pricedb/io-utils/cache');
```

## Modules

### Logger

A flexible logging service that supports console, file, and custom logging handlers.

#### Features
- Configurable log levels (debug, info, warn, error)
- Multiple output formats (JSON, simple text)
- Console and file logging support
- Custom log handlers
- Child loggers with default metadata
- Built-in timing utilities

#### Usage

```javascript
const { Logger } = require('@pricedb/io-utils');

// Create logger instance
const logger = new Logger({
  level: 'info',
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  format: 'json'
});

// Basic logging
logger.info('Application started');
logger.warn('This is a warning', { userId: 123 });
logger.error('An error occurred', { error: 'details' });

// Create child logger with default metadata
const requestLogger = logger.child({ requestId: 'req-123' });
requestLogger.info('Processing request'); // Includes requestId automatically

// Timing operations
const timer = logger.timer('database-query');
// ... perform operation
timer.end('Query completed'); // Logs with duration
```

#### Configuration Options

```javascript
const logger = new Logger({
  level: 'info',              // Minimum log level: debug, info, warn, error
  enableConsole: true,        // Enable console output
  enableFile: false,          // Enable file output
  filePath: null,             // Path to log file
  format: 'json',             // Format: 'json' or 'simple'
  includeTimestamp: true,     // Include timestamp in logs
  includeLevel: true,         // Include log level in output
  customHandler: null         // Custom log handler function
});
```

#### Methods

- `setLevel(level)` - Set minimum log level
- `setConsoleEnabled(enabled)` - Enable/disable console logging
- `setFileEnabled(enabled, filePath)` - Enable/disable file logging
- `setCustomHandler(handler)` - Set custom log handler
- `debug(message, metadata)` - Log debug message
- `info(message, metadata)` - Log info message
- `warn(message, metadata)` - Log warning message
- `error(message, metadata)` - Log error message
- `child(metadata)` - Create child logger with default metadata
- `timer(name)` - Create timing utility

### CacheService

An in-memory caching service with TTL support, size limits, and automatic cleanup.

#### Features
- Configurable TTL (Time To Live)
- Maximum cache size with LRU eviction
- Automatic cleanup of expired entries
- Cache statistics and monitoring
- Promise-based API
- Key generation utilities

#### Usage

```javascript
const { CacheService } = require('@pricedb/io-utils');

// Create cache instance
const cache = new CacheService({
  defaultTTL: 300,     // 5 minutes
  maxSize: 1000,       // Maximum 1000 entries
  enableLogging: true,
  logger: logger
});

// Basic caching
await cache.set('user:123', { name: 'John', email: 'john@example.com' });
const user = await cache.get('user:123');

// Cache with custom TTL
await cache.set('temp:data', { value: 'temporary' }, 60); // 1 minute TTL

// Get or set pattern
const expensiveData = await cache.getOrSet('expensive:operation', async () => {
  // This function only runs if data is not in cache
  return await performExpensiveOperation();
}, 600); // Cache for 10 minutes

// Generate cache keys for APIs
const cacheKey = cache.generateKey('/api/users', { page: 1, limit: 10 });
await cache.set(cacheKey, apiResponse);

// Cache statistics
const stats = cache.getStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
```

#### Configuration Options

```javascript
const cache = new CacheService({
  defaultTTL: 300,           // Default TTL in seconds
  maxSize: 1000,             // Maximum number of entries
  enableLogging: false,      // Enable logging
  logger: null,              // Logger instance
  cleanupInterval: 60000     // Cleanup interval in milliseconds
});
```

#### Methods

- `get(key)` - Get cached value
- `set(key, value, ttl)` - Set cached value with optional TTL
- `del(key)` - Delete cached value
- `has(key)` - Check if key exists
- `clear()` - Clear all cached data
- `keys()` - Get all cache keys
- `getOrSet(key, fn, ttl)` - Get from cache or execute function
- `generateKey(endpoint, params)` - Generate cache key
- `getStats()` - Get cache statistics

### BaseController

A base controller class for Express.js applications with common patterns and utilities.

#### Features
- Standardized response formats
- Error handling utilities
- Input validation helpers
- Pagination support
- Rate limiting middleware
- Async route wrapping
- Database error handling

#### Usage

```javascript
const { BaseController } = require('@pricedb/io-utils');
const express = require('express');

class UserController extends BaseController {
  constructor() {
    super({
      enableLogging: true,
      logger: logger,
      defaultPaginationLimit: 20
    });
  }

  // Use asyncHandler to wrap async routes
  getUsers = this.asyncHandler(async (req, res) => {
    try {
      // Validate input
      if (!this.validateInput(req, res)) return;

      // Parse pagination
      const { page, limit, offset } = this.parsePagination(req.query);

      // Get users (example)
      const users = await getUsersFromDb(offset, limit);

      // Send success response
      this.sendSuccess(res, users, 200, { 
        pagination: { page, limit, total: users.length } 
      });

    } catch (error) {
      this.handleDbError(res, error, 'getting users');
    }
  });
}

// Static usage
app.get('/users', BaseController.asyncHandler(async (req, res) => {
  const users = await getUsers();
  BaseController.sendSuccess(res, users);
}));
```

#### Methods

- `sendSuccess(res, data, statusCode, metadata)` - Send success response
- `sendError(res, message, statusCode, details)` - Send error response
- `sendNotFound(res, resource)` - Send 404 response
- `validateInput(req, res, next)` - Validate request input
- `handleDbError(res, error, operation)` - Handle database errors
- `parsePagination(query, options)` - Parse pagination parameters
- `generateCacheKey(endpoint, params)` - Generate cache keys
- `asyncHandler(fn)` - Wrap async route handlers
- `createRateLimit(cache, options)` - Create rate limiting middleware

### CloudflareProtection

Middleware to ensure requests come through Cloudflare and provide additional security.

#### Features
- Verify Cloudflare headers
- Block direct IP access
- Domain allowlist
- Development mode support
- Request logging
- IP whitelisting

#### Usage

```javascript
const { CloudflareProtection } = require('@pricedb/io-utils');
const express = require('express');

const app = express();

// Basic usage
const cloudflare = new CloudflareProtection({
  allowedDomains: ['yourdomain.com', 'api.yourdomain.com'],
  developmentMode: process.env.NODE_ENV === 'development',
  enableLogging: true,
  logger: logger
});

app.use(cloudflare.middleware());

// Or use static factory method
app.use(CloudflareProtection.create({
  allowedDomains: ['yourdomain.com']
}));

// Create whitelist for specific IPs
const whitelistMiddleware = cloudflare.createWhitelistMiddleware([
  '192.168.1.100',
  '10.0.0.50'
]);

app.use('/admin', whitelistMiddleware);
```

#### Configuration Options

```javascript
const cloudflare = new CloudflareProtection({
  allowedDomains: [],         // Array of allowed domains
  blockDirectIP: true,        // Block direct IP access
  requireCloudflare: true,    // Require Cloudflare headers
  developmentMode: false,     // Skip all checks in development
  logBlocked: true,          // Log blocked requests
  allowLocalhost: false,      // Allow localhost requests
  enableLogging: false,       // Enable logging
  logger: null               // Logger instance
});
```

## Complete Example

```javascript
const express = require('express');
const { Logger, CacheService, BaseController, CloudflareProtection } = require('@pricedb/io-utils');

// Initialize utilities
const logger = new Logger({
  level: 'info',
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  format: 'json'
});

const cache = new CacheService({
  defaultTTL: 300,
  maxSize: 1000,
  enableLogging: true,
  logger: logger
});

// Express app
const app = express();
app.use(express.json());

// Cloudflare protection
app.use(CloudflareProtection.create({
  allowedDomains: ['yourdomain.com'],
  developmentMode: process.env.NODE_ENV === 'development',
  enableLogging: true,
  logger: logger
}));

// API Controller
class ApiController extends BaseController {
  constructor() {
    super({ enableLogging: true, logger });
  }

  getData = this.asyncHandler(async (req, res) => {
    const cacheKey = this.generateCacheKey('/api/data', req.query);
    
    const data = await cache.getOrSet(cacheKey, async () => {
      logger.info('Fetching fresh data');
      return await fetchDataFromDatabase();
    }, 600);

    this.sendSuccess(res, data);
  });
}

const apiController = new ApiController();
app.get('/api/data', apiController.getData);

// Error handling
app.use(apiController.errorHandler.bind(apiController));

app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
```

## API Reference

See the individual class documentation above for detailed API information.

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.