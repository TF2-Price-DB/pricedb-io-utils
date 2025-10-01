const { Logger, CacheService, BaseController, CloudflareProtection } = require('./index');

async function testModules() {
  console.log('Testing @pricedb-io/utils modules...\n');

  // Test Logger
  console.log('1. Testing Logger:');
  const logger = new Logger({
    level: 'info',
    enableConsole: true,
    format: 'simple'
  });

  logger.info('Logger test - info message');
  logger.warn('Logger test - warning message', { test: true });
  logger.error('Logger test - error message');

  // Test child logger
  const childLogger = logger.child({ component: 'test' });
  childLogger.info('Child logger test');

  console.log('\n2. Testing CacheService:');
  const cache = new CacheService({
    defaultTTL: 60,
    maxSize: 100,
    enableLogging: true,
    logger: logger
  });

  // Test basic caching
  await cache.set('test:key', { message: 'Hello Cache!' });
  const cached = await cache.get('test:key');
  console.log('Cached value:', cached);

  // Test get-or-set
  const computed = await cache.getOrSet('expensive:operation', async () => {
    console.log('Computing expensive operation...');
    return { result: 'Computed value', timestamp: new Date() };
  }, 30);
  console.log('Computed value:', computed);

  // Test cache stats
  console.log('Cache stats:', cache.getStats());

  console.log('\n3. Testing BaseController:');
  // Mock Express response object
  const mockRes = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log(`Response [${this.statusCode}]:`, JSON.stringify(data, null, 2));
      return this;
    },
    statusCode: 200
  };

  const controller = new BaseController({
    enableLogging: true,
    logger: logger
  });

  controller.sendSuccess(mockRes, { message: 'Success test' });
  controller.sendError(mockRes, 'Test error message', 400);

  console.log('\n4. Testing CloudflareProtection:');
  const cloudflare = new CloudflareProtection({
    allowedDomains: ['test.com'],
    developmentMode: true, // Skip checks in test
    enableLogging: true,
    logger: logger
  });

  console.log('Cloudflare config:', cloudflare.getConfig());

  console.log('\n✅ All modules tested successfully!');
  
  // Cleanup
  cache.destroy();
}

// Run tests
testModules().catch(console.error);