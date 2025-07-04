module.exports = {
  // Helmet.js configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For markdown styles
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // CSRF protection
  csrf: {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  },
  
  // Input validation
  validation: {
    maxMessageLength: 10000,
    maxSessionIdLength: 100,
    allowedMessageTypes: ['user', 'assistant'],
    sanitizeOptions: {
      allowedTags: [], // No HTML in messages
      allowedAttributes: {},
      textFilter: (text) => typeof text === 'string' ? text.trim() : text
    }
  },
  
  // Auth configuration
  auth: {
    enabled: true, // Authentication is now implemented
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    requireAuth: false, // Set to true to require auth for all API endpoints
    mockAuth: process.env.USE_MOCK_AUTH === 'true' // Use mock auth in development
  }
};