// HTTP Adapter to make Express middleware work with raw Node.js HTTP server

// Polyfill Express-like methods on raw Node.js request/response objects
function enhanceRequest(req) {
  // Add Express-like properties
  req.body = null;
  req.query = {};
  req.params = {};
  req.cookies = {};
  
  // Parse URL and query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  req.path = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  
  // Parse cookies if cookie header exists
  if (req.headers.cookie) {
    req.cookies = parseCookies(req.headers.cookie);
  }
  
  // Add Express-like methods
  req.get = function(header) {
    return req.headers[header.toLowerCase()];
  };
  
  // Add IP address
  req.ip = req.connection.remoteAddress || req.socket.remoteAddress;
  
  // Protocol
  req.protocol = req.connection.encrypted ? 'https' : 'http';
  
  // Session ID placeholder
  req.sessionID = req.cookies['session-id'] || req.ip;
}

function enhanceResponse(res) {
  // Add Express-like methods
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };
  
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  
  res.cookie = function(name, value, options = {}) {
    const cookieParts = [`${name}=${value}`];
    
    if (options.httpOnly) cookieParts.push('HttpOnly');
    if (options.secure) cookieParts.push('Secure');
    if (options.sameSite) cookieParts.push(`SameSite=${options.sameSite}`);
    if (options.maxAge) cookieParts.push(`Max-Age=${options.maxAge}`);
    if (options.path) cookieParts.push(`Path=${options.path}`);
    
    const existingCookies = res.getHeader('Set-Cookie') || [];
    const cookies = Array.isArray(existingCookies) ? existingCookies : [existingCookies];
    cookies.push(cookieParts.join('; '));
    
    res.setHeader('Set-Cookie', cookies);
    return res;
  };
  
  // Store locals
  res.locals = {};
}

// Parse cookies from cookie header
function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
}

// Parse JSON body
async function parseBody(req) {
  // If body already parsed (not null, not undefined), skip
  if (req.body !== undefined && req.body !== null) {
    console.log('[parseBody] Body already parsed, skipping');
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        console.log('[parseBody] Body parsed successfully');
        resolve();
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Apply middleware to raw Node.js request/response
async function applyMiddleware(middleware, req, res) {
  // Enhance request and response objects (only if not already enhanced)
  if (!req.get) {
    enhanceRequest(req);
    enhanceResponse(res);
  }
  
  // Parse body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // Skip if body already parsed
    console.log(`[applyMiddleware] Checking body for ${req.method} - req.body:`, req.body);
    if (req.body === null || req.body === undefined) {
      try {
        console.log('[applyMiddleware] Body not parsed, calling parseBody...');
        await parseBody(req);
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        throw error;
      }
    } else {
      console.log('[applyMiddleware] Body already parsed, skipping parseBody');
    }
  }
  
  // Apply middleware
  return new Promise((resolve, reject) => {
    middleware(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  enhanceRequest,
  enhanceResponse,
  parseBody,
  applyMiddleware
};