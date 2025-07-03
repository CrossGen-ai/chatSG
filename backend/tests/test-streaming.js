#!/usr/bin/env node

const http = require('http');

console.log('Testing ChatSG Streaming Endpoint...\n');

function testStreaming(message = "Hello, how are you?") {
    console.log(`[TEST] Sending message: "${message}"`);
    
    const postData = JSON.stringify({
        message: message,
        sessionId: 'test-streaming-' + Date.now()
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat/stream',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Accept': 'text/event-stream'
        }
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
            
            if (tokenCount === 0) {
                console.error('\n[ERROR] No tokens received! Streaming is not working.');
                process.exit(1);
            } else {
                console.log('\n[SUCCESS] Streaming is working!');
                process.exit(0);
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
testStreaming();