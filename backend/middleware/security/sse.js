/**
 * SSE-specific security middleware
 * Handles connection-based rate limiting and security for Server-Sent Events
 */

const validator = require('./validator');
const sanitizer = require('./sanitizer');
const csrfHeader = require('./csrf-header');

// Track active SSE connections per IP
const activeConnections = new Map(); // IP -> Set of connection IDs
const MAX_CONNECTIONS_PER_IP = 5; // Leave 1 connection for regular requests

// Connection timeout (30 minutes)
const CONNECTION_TIMEOUT = 30 * 60 * 1000;

/**
 * Generate unique connection ID
 */
function generateConnectionId() {
  return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address
 */
function getClientIp(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
}

/**
 * Track new SSE connection
 */
function trackConnection(ip, connectionId, req) {
  if (!activeConnections.has(ip)) {
    activeConnections.set(ip, new Set());
  }
  
  const connections = activeConnections.get(ip);
  connections.add(connectionId);
  
  console.log(`[SSE Security] New connection ${connectionId} from ${ip}. Total: ${connections.size}`);
  
  // Set up cleanup handlers
  const cleanup = () => {
    connections.delete(connectionId);
    if (connections.size === 0) {
      activeConnections.delete(ip);
    }
    console.log(`[SSE Security] Connection ${connectionId} closed. Remaining: ${connections.size}`);
  };
  
  // Clean up on various disconnect events
  req.on('close', cleanup);
  req.on('error', cleanup);
  req.socket.on('close', cleanup);
  
  // Timeout cleanup
  setTimeout(() => {
    if (connections.has(connectionId)) {
      console.log(`[SSE Security] Connection ${connectionId} timed out`);
      cleanup();
      req.socket.destroy();
    }
  }, CONNECTION_TIMEOUT);
  
  return connectionId;
}

/**
 * Check if IP has too many connections
 */
function checkConnectionLimit(ip) {
  const connections = activeConnections.get(ip);
  if (!connections) return true;
  
  return connections.size < MAX_CONNECTIONS_PER_IP;
}

/**
 * Apply SSE-specific security checks
 * This should be called BEFORE setting SSE headers
 */
async function secureSSE(req, res) {
  const ip = getClientIp(req);
  
  // 1. Check connection limit
  if (!checkConnectionLimit(ip)) {
    console.log(`[SSE Security] Connection limit exceeded for ${ip}`);
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Too many SSE connections',
      message: 'Maximum concurrent SSE connections reached. Please close other tabs or wait.'
    }));
    return false;
  }
  
  // 2. CSRF verification - bypass in dev mode unless testing
  if (process.env.CHATSG_ENVIRONMENT === 'dev' && process.env.NODE_ENV !== 'test') {
    console.log('[SSE Security] Bypassing CSRF validation in development mode');
  } else {
    const headerToken = req.headers['x-csrf-token'];
    if (!headerToken) {
      console.log('[SSE Security] Missing CSRF token');
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'CSRF token validation failed',
        message: 'Missing X-CSRF-Token header'
      }));
      return false;
    }
  }
  
  // 3. Validate request body (already parsed)
  if (!req.body || typeof req.body !== 'object') {
    console.log('[SSE Security] Invalid request body');
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Invalid request',
      message: 'Request body is required'
    }));
    return false;
  }
  
  // 4. Validate and sanitize input using existing validators
  // Create a mock next function for the validator
  const validationResult = await new Promise((resolve) => {
    validator.validateRequest(req, res, (err) => {
      if (err) {
        resolve({ valid: false, error: err });
      } else {
        resolve({ valid: true });
      }
    });
  });
  
  if (!validationResult.valid) {
    console.log('[SSE Security] Validation failed:', validationResult.error);
    // Response already sent by validator
    return false;
  }
  
  // 5. Sanitize input
  const sanitizationResult = await new Promise((resolve) => {
    sanitizer.sanitizeInput(req, res, (err) => {
      if (err) {
        resolve({ valid: false, error: err });
      } else {
        resolve({ valid: true });
      }
    });
  });
  
  if (!sanitizationResult.valid) {
    console.log('[SSE Security] Sanitization failed:', sanitizationResult.error);
    return false;
  }
  
  // 6. Track this connection
  const connectionId = trackConnection(ip, generateConnectionId(), req);
  req.sseConnectionId = connectionId;
  
  console.log('[SSE Security] All security checks passed');
  return true;
}

/**
 * Get connection statistics
 */
function getConnectionStats() {
  const stats = {
    totalIPs: activeConnections.size,
    totalConnections: 0,
    byIP: {}
  };
  
  for (const [ip, connections] of activeConnections.entries()) {
    stats.totalConnections += connections.size;
    stats.byIP[ip] = connections.size;
  }
  
  return stats;
}

module.exports = {
  secureSSE,
  getConnectionStats,
  MAX_CONNECTIONS_PER_IP
};