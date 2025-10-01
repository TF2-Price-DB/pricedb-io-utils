const express = require('express');
const { Logger, CacheService, BaseController, CloudflareProtection } = require('@pricedb/io-utils');

// Initialize logger
const logger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log',
  format: 'json'
});

// Initialize cache
const cache = new CacheService({
  defaultTTL: 300,
  maxSize: 1000,
  enableLogging: true,
  logger: logger
});

// Initialize Express app
const app = express();
app.use(express.json());

// Add Cloudflare protection
const cloudflareProtection = new CloudflareProtection({
  allowedDomains: ['yourapp.com', 'api.yourapp.com'],
  developmentMode: process.env.NODE_ENV === 'development',
  enableLogging: true,
  logger: logger
});

app.use(cloudflareProtection.middleware());

// API Controller
class ApiController extends BaseController {
  constructor() {
    super({
      enableLogging: true,
      logger: logger,
      defaultPaginationLimit: 20
    });
  }

  // Get users with caching and pagination
  async getUsers(req, res) {
    const { page, limit } = this.parsePagination(req.query);
    const cacheKey = this.generateCacheKey('/api/users', { page, limit });

    const users = await cache.getOrSet(cacheKey, async () => {
      logger.info('Fetching users from database', { page, limit });
      // Simulate database call
      return {
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ],
        total: 2
      };
    }, 600); // Cache for 10 minutes

    this.sendSuccess(res, users.users, 200, {
      pagination: { page, limit, total: users.total }
    });
  }

  // Get single user
  async getUser(req, res) {
    const { id } = req.params;
    const cacheKey = `user:${id}`;

    const user = await cache.getOrSet(cacheKey, async () => {
      logger.info('Fetching user from database', { userId: id });
      // Simulate database call
      if (id === '1') {
        return { id: 1, name: 'John Doe', email: 'john@example.com' };
      }
      return null;
    }, 300);

    if (!user) {
      return this.sendNotFound(res, 'User');
    }

    this.sendSuccess(res, user);
  }

  // Health check endpoint
  async health(req, res) {
    const cacheStats = cache.getStats();
    
    this.sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cache: cacheStats
    });
  }
}

// Initialize controller
const apiController = new ApiController();

// Routes
app.get('/health', apiController.asyncHandler(apiController.health.bind(apiController)));
app.get('/api/users', apiController.asyncHandler(apiController.getUsers.bind(apiController)));
app.get('/api/users/:id', apiController.asyncHandler(apiController.getUser.bind(apiController)));

// Rate limiting example
const rateLimitMiddleware = apiController.createRateLimit(cache, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
});

app.use('/api', rateLimitMiddleware);

// Error handling
app.use(apiController.errorHandler.bind(apiController));

// 404 handler
app.use((req, res) => {
  apiController.sendNotFound(res, 'Endpoint');
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  
  // Clear cache
  await cache.clear();
  cache.destroy();
  
  logger.info('Application shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  
  // Clear cache
  await cache.clear();
  cache.destroy();
  
  logger.info('Application shutdown complete');
  process.exit(0);
});