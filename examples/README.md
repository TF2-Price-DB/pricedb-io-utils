# Examples

This directory contains usage examples for @pricedb/io-utils modules.

## Basic Examples

### Logger Example

```javascript
const { Logger } = require('@pricedb/io-utils');

// Basic setup
const logger = new Logger({
  level: 'info',
  enableConsole: true,
  format: 'json'
});

logger.info('Application started');
logger.error('Something went wrong', { error: 'details' });

// Child logger with context
const requestLogger = logger.child({ requestId: '12345' });
requestLogger.info('Processing request');
```

### Cache Example

```javascript
const { CacheService } = require('@pricedb/io-utils');

const cache = new CacheService({
  defaultTTL: 300, // 5 minutes
  maxSize: 1000
});

// Basic caching
await cache.set('user:123', { name: 'John' });
const user = await cache.get('user:123');

// Get-or-set pattern
const data = await cache.getOrSet('expensive:query', async () => {
  return await performExpensiveOperation();
}, 600);
```

### Controller Example

```javascript
const { BaseController } = require('@pricedb/io-utils');
const express = require('express');

class UserController extends BaseController {
  getUser = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await findUserById(id);
    
    if (!user) {
      return this.sendNotFound(res, 'User');
    }
    
    this.sendSuccess(res, user);
  });
}
```

### Cloudflare Protection Example

```javascript
const { CloudflareProtection } = require('@pricedb/io-utils');

const app = express();

// Protect all routes
app.use(CloudflareProtection.create({
  allowedDomains: ['myapp.com', 'api.myapp.com'],
  developmentMode: process.env.NODE_ENV === 'development'
}));
```

## Complete Application Example

See [complete-app.js](./complete-app.js) for a full Express.js application using all modules.