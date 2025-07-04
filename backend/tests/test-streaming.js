#!/usr/bin/env node

const http = require('http');

console.log('Testing ChatSG Streaming Endpoint with Security...\n');

// First, get CSRF token
function getCSRFToken(callback) {
    console.log('[TEST] Getting CSRF token...');
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/config/security',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        let csrfToken = res.headers['x-csrf-token'];
        console.log(`[TEST] CSRF token received: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'none'}`);
        callback(csrfToken);
    });
    
    req.on('error', (e) => {
        console.error(`[TEST] Failed to get CSRF token: ${e.message}`);
        callback(null);
    });
    
    req.end();
}

function testStreaming(message = "Hello, how are you?", csrfToken = null) {
    console.log(`\n[TEST] Sending message: "${message}"`);
    console.log(`[TEST] Using CSRF token: ${csrfToken ? 'Yes' : 'No'}`);
    
    const postData = JSON.stringify({
        message: message,
        sessionId: 'test-streaming-' + Date.now()
    });

    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'text/event-stream'
    };
    
    // Add CSRF token if available
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat/stream',
        method: 'POST',
        headers: headers
    };

    console.log('[TEST] Request options:', options);
    console.log('[TEST] Request body:', postData);

    const req = http.request(options, (res) => {
        console.log(`[TEST] Response status: ${res.statusCode}`);
        console.log(`[TEST] Response headers:`, res.headers);
        
        let eventBuffer = '';
        let eventCount = 0;
        let tokenCount = 0;
        let fullResponse = '';
        
        res.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            
            // If not an SSE response, just log it
            if (res.statusCode !== 200) {
                console.log(`[TEST] Error response body: ${chunkStr}`);
                return;
            }
            
            eventBuffer += chunkStr;
            
            // Split on double newlines (SSE event separator)
            const events = eventBuffer.split('\n\n');
            
            // Keep the last incomplete event in the buffer
            eventBuffer = events.pop() || '';
            
            for (const event of events) {
                if (!event.trim()) continue;
                
                const lines = event.split('\n');
                let eventType = '';
                let eventData = null;
                
                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        eventType = line.substring(6).trim();
                    } else if (line.startsWith('data:')) {
                        try {
                            eventData = JSON.parse(line.substring(5).trim());
                        } catch (e) {
                            console.error(`[TEST] Failed to parse data:`, e.message, 'Line:', line);
                        }
                    }
                }
                
                if (eventType && eventData) {
                    eventCount++;
                    console.log(`\n[TEST] Event: ${eventType}, Data:`, JSON.stringify(eventData));
                    
                    if (eventType === 'token' && eventData.content) {
                        tokenCount++;
                        fullResponse += eventData.content;
                        process.stdout.write(eventData.content);
                    }
                }
            }
        });

        res.on('end', () => {
            console.log(`\n\n[TEST] Stream ended`);
            console.log(`[TEST] Total events received: ${eventCount}`);
            console.log(`[TEST] Total tokens received: ${tokenCount}`);
            console.log(`[TEST] Full response length: ${fullResponse.length} chars`);
            console.log(`[TEST] Full response: "${fullResponse}"`);
            
            if (res.statusCode !== 200) {
                console.error(`\n[ERROR] HTTP ${res.statusCode} error`);
            } else if (tokenCount === 0) {
                console.error('\n[ERROR] No tokens received! Streaming is not working.');
            } else {
                console.log('\n[SUCCESS] Streaming is working!');
            }
        });

        res.on('error', (e) => {
            console.error(`[TEST] Response error: ${e.message}`);
            process.exit(1);
        });
    });

    req.on('error', (e) => {
        console.error(`[TEST] Request error: ${e.message}`);
        process.exit(1);
    });

    req.write(postData);
    req.end();
}

// Run the test
console.log('[TEST] Starting streaming test with security...\n');

// Test 1: Without CSRF token (should fail)
console.log('=== Test 1: Without CSRF Token ===');
testStreaming("Test without CSRF token");

// Test 2: With CSRF token (should work)
setTimeout(() => {
    console.log('\n\n=== Test 2: With CSRF Token ===');
    getCSRFToken((csrfToken) => {
        if (csrfToken) {
            testStreaming("Test with CSRF token", csrfToken);
        } else {
            console.error('[TEST] Could not get CSRF token, test cannot proceed');
            process.exit(1);
        }
    });
}, 2000);