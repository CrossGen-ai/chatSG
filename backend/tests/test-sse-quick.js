#!/usr/bin/env node

const http = require('http');

// Enable mock auth
process.env.USE_MOCK_AUTH = 'true';

// First get CSRF token
const getOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/config/security',
    method: 'GET'
};

http.get(getOptions, (res) => {
    const csrfToken = res.headers['x-csrf-token'];
    console.log('Got CSRF token:', csrfToken ? csrfToken.substring(0, 20) + '...' : 'none');
    
    if (!csrfToken) {
        console.error('No CSRF token received!');
        process.exit(1);
    }
    
    // Now test SSE with the token
    const postData = JSON.stringify({
        message: "Quick test",
        sessionId: 'test-' + Date.now()
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat/stream',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Accept': 'text/event-stream',
            'X-CSRF-Token': csrfToken,
            'Cookie': res.headers['set-cookie'] ? res.headers['set-cookie'][0] : ''
        }
    };
    
    const req = http.request(options, (res) => {
        console.log(`\nSSE Status: ${res.statusCode}`);
        console.log(`SSE Headers:`, res.headers);
        
        res.on('data', (chunk) => {
            console.log('SSE Data:', chunk.toString());
        });
        
        res.on('end', () => {
            console.log('SSE Stream ended');
        });
    });
    
    req.on('error', (e) => {
        console.error(`SSE Error: ${e.message}`);
    });
    
    req.write(postData);
    req.end();
});