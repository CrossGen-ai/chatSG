#!/usr/bin/env node

const http = require('http');

// Get CSRF token first
http.get('http://localhost:3000/api/config/security', (res) => {
    const csrfToken = res.headers['x-csrf-token'];
    console.log('Got CSRF token:', csrfToken ? 'YES' : 'NO');
    
    if (!csrfToken) {
        console.error('No CSRF token received!');
        process.exit(1);
    }
    
    // Now test streaming with simple message
    const postData = JSON.stringify({
        message: "hello",
        sessionId: "test"
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
    
    console.log('Sending request...');
    const req = http.request(options, (res) => {
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        
        if (res.statusCode !== 200) {
            res.on('data', chunk => console.log('Error:', chunk.toString()));
            return;
        }
        
        let eventCount = 0;
        res.on('data', (chunk) => {
            const data = chunk.toString();
            console.log('Received:', data);
            eventCount++;
            
            // Exit after receiving some events
            if (eventCount > 5) {
                console.log('\nSuccess! Streaming works.');
                process.exit(0);
            }
        });
        
        res.on('end', () => {
            console.log('Stream ended');
        });
    });
    
    req.on('error', (e) => {
        console.error('Request error:', e.message);
    });
    
    req.write(postData);
    req.end();
});