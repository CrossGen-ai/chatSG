const rateLimit = require('express-rate-limit');

module.exports = function(options) {
  // Create rate limiter with configuration
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: options.standardHeaders,
    legacyHeaders: options.legacyHeaders,
    
    // Custom key generator for future auth support
    keyGenerator: function(req) {
      // When auth is enabled, we can use user ID as well
      return req.ip || req.connection.remoteAddress;
    },
    
    // Custom handler for rate limit exceeded
    handler: function(req, res) {
      res.status(429).json({
        error: 'Too many requests',
        message: options.message,
        retryAfter: Math.round(options.windowMs / 1000)
      });
    },
    
    // Skip successful requests from count (optional)
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
};