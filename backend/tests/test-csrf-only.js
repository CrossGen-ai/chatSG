#!/usr/bin/env node

const http = require('http');

// Get CSRF token and test
http.get('http://localhost:3000/api/config/security', (res) => {
    const csrfToken = res.headers['x-csrf-token'];
    console.log('CSRF token received:', csrfToken ? 'YES' : 'NO');
    
    if (!csrfToken) {
        console.error('No CSRF token!');
        process.exit(1);
    }
    
    // Test with CSRF token
    const postData = JSON.stringify({
        message: "hello with CSRF",
        sessionId: "test-csrf"
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat/stream',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'X-CSRF-Token': csrfToken
        }
    };
    
    console.log('Testing with CSRF token...');
    const req = http.request(options, (res) => {
        console.log('Status:', res.statusCode);
        
        if (res.statusCode === 200) {
            console.log('✅ SUCCESS: SSE works with CSRF token!');
            let count = 0;
            res.on('data', (chunk) => {
                if (++count <= 3) {
                    console.log('Event:', chunk.toString().trim());
                }
            });
        } else {
            res.on('data', chunk => console.log('Error:', chunk.toString()));
        }
    });
    
    req.on('error', (e) => {
        console.error('Request error:', e.message);
    });
    
    req.write(postData);
    req.end();
});