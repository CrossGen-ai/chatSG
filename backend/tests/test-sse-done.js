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
        message: "What is 2+2?",
        sessionId: "test-done"
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
        console.log('Headers:', res.headers);
        
        if (res.statusCode !== 200) {
            res.on('data', chunk => console.log('Error:', chunk.toString()));
            return;
        }
        
        let receivedDone = false;
        let eventCount = 0;
        let fullResponse = '';
        
        res.on('data', (chunk) => {
            const data = chunk.toString();
            console.log('Chunk:', data);
            
            // Parse SSE events
            const lines = data.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('event: done')) {
                    console.log('\n✅ Received DONE event!');
                    receivedDone = true;
                }
                if (line.startsWith('data: ') && lines[i-1]?.trim().startsWith('event: token')) {
                    const tokenData = JSON.parse(line.slice(6));
                    fullResponse += tokenData.content || '';
                }
            }
            
            eventCount++;
        });
        
        res.on('end', () => {
            console.log('\n🔚 Stream ended');
            console.log('Received done event:', receivedDone);
            console.log('Total events:', eventCount);
            console.log('Full response:', fullResponse);
            
            if (!receivedDone) {
                console.error('❌ ERROR: Stream ended without done event!');
                process.exit(1);
            } else {
                console.log('✅ SUCCESS: Stream completed properly');
                process.exit(0);
            }
        });
        
        res.on('close', () => {
            console.log('🔒 Connection closed');
        });
    });
    
    req.on('error', (e) => {
        console.error('Request error:', e.message);
    });
    
    req.write(postData);
    req.end();
});