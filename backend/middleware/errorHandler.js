// Centralized error handling middleware

const errorHandler = (err, req, res, next) => {
  // Log error for monitoring (in production, use proper logging service)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Default error values
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let error = 'Server error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    error = 'Validation error';
    message = 'Invalid input data';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    error = 'Unauthorized';
    message = 'Authentication required';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    error = 'Forbidden';
    message = 'Access denied';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    error = 'Not found';
    message = 'Resource not found';
  } else if (err.name === 'RateLimitError') {
    status = 429;
    error = 'Too many requests';
    message = 'Rate limit exceeded';
  }
  
  // Security: Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An error occurred processing your request';
  }
  
  // Send error response
  res.status(status).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      details: err.details,
      stack: err.stack
    })
  });
};

// Custom error classes
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

// Async error wrapper to catch promise rejections
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  asyncHandler
};