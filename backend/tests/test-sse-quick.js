#!/usr/bin/env node

const http = require('http');

// Test SSE with CSRF token
const csrfToken = process.argv[2] || '909308d68d4a5d808f679e63864f27411971a1353cf32bd394b4753c2b6bc0ec';

console.log('Testing SSE with CSRF token:', csrfToken.substring(0, 20) + '...');

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
        'X-CSRF-Token': csrfToken
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    res.on('data', (chunk) => {
        console.log('Data:', chunk.toString());
    });
    
    res.on('end', () => {
        console.log('Stream ended');
    });
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();