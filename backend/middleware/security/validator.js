const { body, validationResult } = require('express-validator');
const config = require('../../config/security.config');

const validateChatMessage = [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: config.validation.maxMessageLength })
    .withMessage('Message must be between 1 and 10000 characters'),
  
  body('sessionId')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .isLength({ max: config.validation.maxSessionIdLength })
    .withMessage('Invalid session ID format'),
  
  body('activeSessionId')
    .optional()
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/),
    
  // CRITICAL: Fail fast on validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validateSessionId = [
  body('sessionId')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .isLength({ max: config.validation.maxSessionIdLength })
    .withMessage('Invalid session ID format'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// General request validator middleware
const validateRequest = (req, res, next) => {
  // For routes that don't have specific validators
  // Apply basic security checks
  
  // First, check if this is a chat endpoint that needs specific validation
  if (req.url === '/api/chat' && req.method === 'POST') {
    // Validate message
    if (!req.body || !req.body.message) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Message is required', param: 'message' }]
      });
    }
    
    if (typeof req.body.message !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Message must be a string', param: 'message' }]
      });
    }
    
    if (req.body.message.length < 1 || req.body.message.length > config.validation.maxMessageLength) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: `Message must be between 1 and ${config.validation.maxMessageLength} characters`, param: 'message' }]
      });
    }
    
    // Validate sessionId
    if (!req.body.sessionId) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Session ID is required', param: 'sessionId' }]
      });
    }
    
    if (typeof req.body.sessionId !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Session ID must be a string', param: 'sessionId' }]
      });
    }
    
    const sessionIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!sessionIdPattern.test(req.body.sessionId)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Invalid session ID format', param: 'sessionId' }]
      });
    }
    
    if (req.body.sessionId.length > config.validation.maxSessionIdLength) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: `Session ID exceeds maximum length of ${config.validation.maxSessionIdLength}`, param: 'sessionId' }]
      });
    }
  }
  
  // Check for suspicious patterns in all string inputs
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<svg/i,
    /<img.*on/i
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return false;
        }
      }
    }
    return true;
  };
  
  // Check all body parameters
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (!checkValue(value)) {
        return res.status(400).json({
          error: 'Invalid input detected',
          message: 'Request contains potentially dangerous content'
        });
      }
    }
  }
  
  next();
};

module.exports = {
  validateChatMessage,
  validateSessionId,
  validateRequest
};