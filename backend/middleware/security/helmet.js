const helmet = require('helmet');

module.exports = function(options) {
  // Configure Helmet with security headers
  return helmet({
    contentSecurityPolicy: options.contentSecurityPolicy,
    hsts: options.hsts,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    permittedCrossDomainPolicies: false
  });
};