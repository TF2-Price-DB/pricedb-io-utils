/**
 * @pricedb/io-utils
 * A collection of utility classes for Node.js applications
 */

const Logger = require('./lib/logger');
const CacheService = require('./lib/cache');
const BaseController = require('./lib/controller');
const CloudflareProtection = require('./lib/cloudflare');

module.exports = {
  Logger,
  CacheService,
  BaseController,
  CloudflareProtection,
  
  // For convenience, also export instances
  logger: new Logger(),
  cache: new CacheService(),
  
  // Middleware factory
  cloudflareMiddleware: CloudflareProtection.create,
};