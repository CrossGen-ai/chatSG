const helmet = require('./helmet');
const rateLimiter = require('./rateLimiter');
const validator = require('./validator');
const sanitizer = require('./sanitizer');
const csrf = require('./csrf');
const auth = require('./auth');
const config = require('../../config/security.config');

module.exports = function securityMiddleware(options = {}) {
  // PATTERN: Layered security - each middleware is independent
  const middlewares = [];
  
  // Layer 1: Security headers (always first)
  middlewares.push(helmet(config.helmet));
  
  // Layer 2: Rate limiting (prevent DoS)
  if (options.rateLimit !== false) {
    middlewares.push(rateLimiter(config.rateLimit));
  }
  
  // Layer 3: CSRF protection
  if (options.csrf !== false) {
    middlewares.push(csrf.initialize(config.csrf));
    middlewares.push(csrf.verify);
  }
  
  // Layer 4: Input validation
  middlewares.push(validator.validateRequest);
  
  // Layer 5: Input sanitization
  middlewares.push(sanitizer.sanitizeInput);
  
  // Layer 6: Authentication (when enabled)
  if (config.auth.enabled) {
    middlewares.push(auth.authenticate);
    
    // Create a wrapper for authorize that skips auth endpoints
    const conditionalAuthorize = (req, res, next) => {
      // Skip authorization for auth endpoints (they must be public!)
      if (req.url.startsWith('/api/auth/') || 
          req.url === '/api/config/security' ||
          req.url === '/api/chat/stream' ||
          req.url.match(/^\/api\/memory\/qdrant\/\w+$/)) {
        return next();
      }
      
      // For all other endpoints, require authentication
      return auth.authorize(req, res, next);
    };
    
    middlewares.push(conditionalAuthorize);
  }
  
  // Return middleware chain
  return (req, res, next) => {
    // Execute middleware in sequence
    let index = 0;
    
    function executeNext(err) {
      if (err) return next(err);
      if (index >= middlewares.length) return next();
      
      const middleware = middlewares[index++];
      middleware(req, res, executeNext);
    }
    
    executeNext();
  };
};