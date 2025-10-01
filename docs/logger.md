# Logger Module

The Logger module provides a flexible, configurable logging service that supports multiple output destinations and formats.

## Features

- **Multiple Log Levels**: debug, info, warn, error with configurable minimum level
- **Multiple Outputs**: Console, file, and custom handlers
- **Flexible Formatting**: JSON or simple text formats
- **Child Loggers**: Create loggers with default metadata context
- **Timing Utilities**: Built-in performance timing helpers
- **Zero Dependencies**: No external logging dependencies required

## Quick Start

```javascript
const { Logger } = require('@pricedb/io-utils');

const logger = new Logger({
  level: 'info',
  enableConsole: true,
  format: 'json'
});

logger.info('Application started');
logger.error('Something went wrong', { error: 'details' });
```

## Configuration

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | string | `'info'` | Minimum log level to process |
| `enableConsole` | boolean | `true` | Enable console output |
| `enableFile` | boolean | `false` | Enable file output |
| `filePath` | string | `null` | Path to log file |
| `format` | string | `'json'` | Log format: 'json' or 'simple' |
| `includeTimestamp` | boolean | `true` | Include timestamp in logs |
| `includeLevel` | boolean | `true` | Include log level in output |
| `customHandler` | function | `null` | Custom log handler function |

## Methods

### Core Logging

#### `log(level, message, metadata)`
Core logging method that all other methods use.

```javascript
logger.log('info', 'User logged in', { userId: 123 });
```

#### `debug(message, metadata)`
Log debug message (lowest priority).

```javascript
logger.debug('Variable state', { variable: value });
```

#### `info(message, metadata)`
Log informational message.

```javascript
logger.info('User action', { action: 'login', userId: 123 });
```

#### `warn(message, metadata)`
Log warning message.

```javascript
logger.warn('Deprecated API used', { endpoint: '/old-api' });
```

#### `error(message, metadata)`
Log error message (highest priority).

```javascript
logger.error('Database connection failed', { 
  error: error.message,
  stack: error.stack 
});
```

### Configuration Methods

#### `setLevel(level)`
Change the minimum log level.

```javascript
logger.setLevel('debug'); // Show all messages
logger.setLevel('error'); // Show only errors
```

#### `setConsoleEnabled(enabled)`
Enable or disable console logging.

```javascript
logger.setConsoleEnabled(false); // Disable console output
```

#### `setFileEnabled(enabled, filePath)`
Enable or disable file logging.

```javascript
logger.setFileEnabled(true, './logs/app.log');
logger.setFileEnabled(false); // Disable file logging
```

#### `setCustomHandler(handler)`
Set a custom log handler function.

```javascript
logger.setCustomHandler((level, message, metadata) => {
  // Send to external logging service
  externalLogger.send({ level, message, metadata });
});
```

### Utility Methods

#### `child(defaultMetadata)`
Create a child logger with default metadata context.

```javascript
const requestLogger = logger.child({ 
  requestId: 'req-123',
  userId: 456 
});

// All logs from this logger will include the default metadata
requestLogger.info('Processing request'); 
// Logs: { message: 'Processing request', requestId: 'req-123', userId: 456 }
```

#### `timer(name)`
Create a performance timer.

```javascript
const timer = logger.timer('database-query');
await performDatabaseQuery();
const duration = timer.end(); // Logs completion time and returns duration in ms
```

#### `getConfig()`
Get current configuration.

```javascript
const config = logger.getConfig();
console.log('Current log level:', config.level);
```

#### `setConfig(options)`
Update multiple configuration options.

```javascript
logger.setConfig({
  level: 'debug',
  enableFile: true,
  filePath: './debug.log'
});
```

## Output Formats

### JSON Format
```json
{
  "timestamp": "2025-10-01T10:30:00.000Z",
  "level": "INFO",
  "message": "User logged in",
  "metadata": {
    "userId": 123,
    "ip": "192.168.1.1"
  }
}
```

### Simple Format
```
[2025-10-01T10:30:00.000Z] [INFO] User logged in - {"userId":123,"ip":"192.168.1.1"}
```

## Error Handling

The logger is designed to be robust and never throw errors that could crash your application:

- File system errors are caught and logged to console
- Invalid configurations use sensible defaults
- Custom handlers that throw errors are caught and warned about

## Performance

- Lazy loading of file system modules
- Efficient string formatting
- Non-blocking file writes
- Minimal memory footprint

## Examples

### Basic Application Logging
```javascript
const logger = new Logger({
  level: 'info',
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log'
});

logger.info('Application starting');

try {
  await startServer();
  logger.info('Server started successfully', { port: 3000 });
} catch (error) {
  logger.error('Failed to start server', {
    error: error.message,
    stack: error.stack
  });
}
```

### Request Logging with Context
```javascript
app.use((req, res, next) => {
  const requestLogger = logger.child({
    requestId: generateId(),
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  req.logger = requestLogger;
  requestLogger.info('Request received');
  
  res.on('finish', () => {
    requestLogger.info('Request completed', {
      status: res.statusCode,
      duration: Date.now() - req.startTime
    });
  });
  
  next();
});
```

### Custom Handler for External Services
```javascript
const logger = new Logger({
  level: 'info',
  enableConsole: true,
  customHandler: (level, message, metadata) => {
    // Send to external logging service (e.g., Datadog, New Relic)
    if (level === 'error') {
      errorTracker.captureException(new Error(message), metadata);
    }
  }
});
```

## Best Practices

1. **Use appropriate log levels**: Reserve `error` for actual errors, `warn` for concerning situations, `info` for significant events, and `debug` for development information.

2. **Include relevant metadata**: Always include context that will help with debugging.

3. **Use child loggers for request context**: Create child loggers per request/operation to maintain context.

4. **Structure your metadata**: Use consistent property names across your application.

5. **Don't log sensitive information**: Be careful not to log passwords, tokens, or personal information.

6. **Use timers for performance monitoring**: Track slow operations with the built-in timer utility.

```javascript
// Good
logger.info('User authentication successful', { 
  userId: user.id, 
  method: 'oauth',
  provider: 'google'
});

// Bad
logger.info('User authentication successful', { 
  user: user, // Might contain sensitive data
  password: '***' // Never log passwords
});
```