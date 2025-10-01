# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-01

### Changed

- Updated package name to @pricedb-io/utils (scoped package)
- Updated all documentation to reflect new package name

## [1.0.0] - 2025-10-01

### Added

- Initial release of @pricedb-io/utils
- **Logger**: Configurable logging service with console, file, and custom handlers
  - Multiple log levels (debug, info, warn, error)
  - JSON and simple text formats
  - Child loggers with default metadata
  - Built-in timing utilities
- **CacheService**: In-memory caching with TTL and size limits
  - Automatic cleanup of expired entries
  - LRU eviction when size limit reached
  - Promise-based API
  - Cache statistics and monitoring
- **BaseController**: Express.js base controller with common patterns
  - Standardized response formats
  - Error handling utilities
  - Input validation helpers
  - Pagination support
  - Rate limiting middleware
  - Async route wrapping
- **CloudflareProtection**: Security middleware for Cloudflare-protected applications
  - Verify Cloudflare headers
  - Block direct IP access
  - Domain allowlist
  - Development mode support
  - IP whitelisting capabilities

### Features

- All classes support dependency injection and configuration
- Comprehensive error handling and logging throughout
- Full TypeScript-style JSDoc documentation
- ESLint and Prettier configuration included
- Modular exports - import only what you need