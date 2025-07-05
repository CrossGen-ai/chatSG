const DOMPurify = require('isomorphic-dompurify');
const config = require('../../config/security.config');

const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs in the request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

function sanitizeObject(obj) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Strip HTML and dangerous content
      let cleanValue = DOMPurify.sanitize(value, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: {},
        KEEP_CONTENT: true 
      });
      
      // Ensure cleanValue is a string
      cleanValue = String(cleanValue);
      
      // Apply additional text filters
      if (config.validation.sanitizeOptions.textFilter) {
        cleanValue = config.validation.sanitizeOptions.textFilter(cleanValue);
      }
      
      // Remove null bytes
      cleanValue = cleanValue.replace(/\0/g, '');
      
      // Normalize whitespace
      cleanValue = cleanValue.replace(/[\r\n\t]+/g, ' ');
      
      sanitized[key] = cleanValue;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function sanitizeString(str) {
  let cleanStr = DOMPurify(str, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: {},
    KEEP_CONTENT: true 
  });
  
  // Ensure cleanStr is a string
  cleanStr = String(cleanStr);
  
  if (config.validation.sanitizeOptions.textFilter) {
    cleanStr = config.validation.sanitizeOptions.textFilter(cleanStr);
  }
  
  cleanStr = cleanStr.replace(/\0/g, '');
  cleanStr = cleanStr.replace(/[\r\n\t]+/g, ' ');
  
  return cleanStr;
}

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject
};