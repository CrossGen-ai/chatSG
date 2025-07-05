const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

// Mock middleware
const mockAuth = require('../../middleware/security/auth');
const mockCSRF = require('../../middleware/security/csrf-header');
const mockRateLimit = require('../../middleware/security/rate-limit');

function createTestApp() {
  const app = express();
  
  // Basic middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Session middleware (memory store for tests)
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 3600000
    }
  }));
  
  // Security middleware
  app.use(mockCSRF.middleware);
  app.use(mockAuth);
  
  // Rate limiting (optional for tests)
  if (process.env.ENABLE_RATE_LIMIT_IN_TESTS !== 'false') {
    app.use(mockRateLimit);
  }
  
  // Test routes
  app.get('/api/config/security', (req, res) => {
    res.json({ 
      csrfEnabled: true,
      authEnabled: true 
    });
  });
  
  app.get('/api/config/markdown', (req, res) => {
    res.json({ 
      enabled: true,
      sanitized: true 
    });
  });
  
  app.get('/api/chats', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Return user-specific chats
    const userId = req.user ? req.user.id : null;
    res.json([
      { id: 'chat1', userId, title: 'Test Chat 1' },
      { id: 'chat2', userId, title: 'Test Chat 2' }
    ]);
  });
  
  app.post('/api/chats', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }
    
    res.status(201).json({
      id: `chat_${Date.now()}`,
      title: title.trim(),
      userId: req.user.id
    });
  });
  
  app.put('/api/chats/:id', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({ updated: true });
  });
  
  app.delete('/api/chats/:id', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.status(204).send();
  });
  
  app.post('/api/chat', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Message and sessionId required' 
      });
    }
    
    // Simulate chat response
    res.json({
      id: `msg_${Date.now()}`,
      message,
      sessionId,
      response: 'Test response'
    });
  });
  
  app.post('/api/chat/stream', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Message and sessionId required' 
      });
    }
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-CSRF-Token': req.csrfToken || ''
    });
    
    // Send SSE events
    res.write('event: connected\ndata: {"status": "connected"}\n\n');
    res.write('event: start\ndata: {"status": "start"}\n\n');
    
    // Simulate streaming response
    setTimeout(() => {
      res.write('event: token\ndata: {"token": "Hello"}\n\n');
      res.write('event: token\ndata: {"token": " world"}\n\n');
      res.write('event: done\ndata: {"status": "done"}\n\n');
      res.end();
    }, 100);
  });
  
  app.post('/api/auth/login', (req, res) => {
    res.json({ message: 'Login endpoint' });
  });
  
  app.get('/api/auth/user', (req, res) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json(req.user);
  });
  
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
  });
  
  // Error handler
  app.use((err, req, res, next) => {
    console.error('Test app error:', err);
    res.status(500).json({ error: err.message });
  });
  
  return app;
}

module.exports = { createTestApp };