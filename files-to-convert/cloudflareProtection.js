/**
 * Middleware to ensure requests only come through Cloudflare
 * Since Cloudflare forwards real client IPs, we rely on Cloudflare headers
 */

const { isIPv4 } = require('net');

const logger = require('../logger');

/**
 * CloudflareProtection middleware class
 */
class CloudflareProtection {
  constructor(options = {}) {
    this.config = {
      allowedDomains: ['pricedb.io', 'ws.pricedb.io'],
      blockDirectIP: true,
      requireCloudflare: true,
      developmentMode: false,
      logBlocked: true,
      allowLocalhost: false,
      ...options,
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate configuration options
   */
  validateConfig() {
    if (!Array.isArray(this.config.allowedDomains)) {
      throw new Error('allowedDomains must be an array');
    }

    if (this.config.allowedDomains.length === 0) {
      throw new Error('At least one allowed domain must be specified');
    }
  }

  /**
   * Check if hostname is a direct IP address
   */
  isDirectIPAccess(hostname) {
    return isIPv4(hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  }

  /**
   * Check if domain is in allowed list
   */
  isDomainAllowed(domain) {
    return this.config.allowedDomains.includes(domain);
  }

  /**
   * Check if request has required Cloudflare headers
   */
  hasCloudflareHeaders(cfRay, cfConnectingIP) {
    return cfRay && cfConnectingIP;
  }

  /**
   * Check if request is from localhost
   */
  isLocalhostRequest(req) {
    const host = req.get('host');
    const hostname = host?.split(':')[0];
    const ip = req.ip || req.connection.remoteAddress;

    // Check hostname
    const isLocalhostHost =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    // Check IP address (handle both IPv4 and IPv6)
    const isLocalhostIP = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

    return isLocalhostHost || isLocalhostIP;
  }

  /**
   * Log blocked request
   */
  logBlockedRequest(reason, req, details = {}) {
    if (this.config.logBlocked) {
      logger.warn('Request blocked by Cloudflare protection', {
        reason,
        host: req.get('host'),
        ip: req.ip,
        userAgent: req.get('user-agent'),
        url: req.originalUrl,
        method: req.method,
        ...details,
      });
    }
  }

  /**
   * Create error response
   */
  createErrorResponse(error, message, statusCode = 403) {
    return {
      error,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Main middleware function
   */
  middleware() {
    return (req, res, next) => {
      const host = req.get('host');
      const cfConnectingIP = req.get('cf-connecting-ip');
      const cfRay = req.get('cf-ray');
      const cfIpCountry = req.get('cf-ipcountry');

      // Skip all checks in development mode
      if (this.config.developmentMode) {
        return next();
      }

      // Skip all checks for localhost if allowed
      if (this.config.allowLocalhost && this.isLocalhostRequest(req)) {
        return next();
      }

      try {
        // Check 1: Block direct IP access via Host header
        if (this.config.blockDirectIP && host) {
          const hostname = host.split(':')[0];
          if (this.isDirectIPAccess(hostname)) {
            const errorResponse = this.createErrorResponse(
              'Direct IP access not allowed',
              'Please use the domain name to access this service'
            );
            this.logBlockedRequest('Direct IP access', req, { hostname });
            return res.status(403).json(errorResponse);
          }
        }

        // Check 2: Ensure domain is in allowed list
        const domain = host?.split(':')[0];
        if (domain && !this.isDomainAllowed(domain)) {
          const errorResponse = this.createErrorResponse(
            'Invalid domain',
            `Domain '${domain}' is not authorized to access this service`
          );
          this.logBlockedRequest('Invalid domain', req, { domain });
          return res.status(403).json(errorResponse);
        }

        // Check 3: Require Cloudflare headers
        if (this.config.requireCloudflare) {
          if (!this.hasCloudflareHeaders(cfRay, cfConnectingIP)) {
            const errorResponse = this.createErrorResponse(
              'Access denied',
              'Requests must come through Cloudflare'
            );
            this.logBlockedRequest('Missing Cloudflare headers', req, {
              cfRay: !!cfRay,
              cfConnectingIP: !!cfConnectingIP,
            });
            return res.status(403).json(errorResponse);
          }
        }

        // Enhance request object with Cloudflare data
        if (cfConnectingIP) {
          req.realClientIP = cfConnectingIP;
          req.cloudflareCountry = cfIpCountry;
          req.cloudflareRay = cfRay;
        }

        next();
      } catch (error) {
        logger.error('Error in Cloudflare protection middleware', {
          error: error.message,
          stack: error.stack,
          host,
          url: req.originalUrl,
        });

        const errorResponse = this.createErrorResponse(
          'Internal server error',
          'An error occurred while processing your request',
          500
        );
        res.status(500).json(errorResponse);
      }
    };
  }

  /**
   * Static factory method for easy instantiation
   */
  static create(options = {}) {
    const instance = new CloudflareProtection(options);
    return instance.middleware();
  }

  /**
   * Update configuration
   */
  updateConfig(newOptions) {
    this.config = { ...this.config, ...newOptions };
    this.validateConfig();
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

module.exports = CloudflareProtection;
