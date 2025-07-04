// Mock HTTP helpers for testing
function createMockReq(options = {}) {
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    body: options.body || null,
    query: options.query || {},
    params: options.params || {},
    cookies: options.cookies || {},
    ip: options.ip || '127.0.0.1',
    connection: { remoteAddress: options.ip || '127.0.0.1' },
    get: function(header) {
      return this.headers[header.toLowerCase()];
    }
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    locals: {},
    
    setHeader: function(name, value) {
      this.headers[name] = value;
    },
    
    getHeader: function(name) {
      return this.headers[name];
    },
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this.setHeader('Content-Type', 'application/json');
      this.body = JSON.stringify(data);
      this.end();
    },
    
    cookie: function(name, value, options) {
      // Simple cookie implementation
      const cookieStr = `${name}=${value}`;
      this.setHeader('Set-Cookie', cookieStr);
      return this;
    },
    
    end: function(data) {
      if (data) this.body = data;
    }
  };
  
  return res;
}

module.exports = {
  createMockReq,
  createMockRes
};