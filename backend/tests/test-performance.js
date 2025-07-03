const http = require('http');

console.log('=== ChatSG Performance Test ===\n');

// Test configuration
const PORT = 3000;
const HOST = 'localhost';
const SESSION_ID = 'perf-test-' + Date.now();

// Performance metrics
const metrics = {
    requestStart: 0,
    firstTokenTime: 0,
    streamStartTime: 0,
    lastTokenTime: 0,
    streamEndTime: 0,
    totalTokens: 0
};

// Function to send streaming request
function testPerformance(message) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            message: message,
            sessionId: SESSION_ID,
            activeSessionId: SESSION_ID
        });

        const options = {
            hostname: HOST,
            port: PORT,
            path: '/api/chat/stream',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`Testing message: "${message}"`);
        console.log('Session ID:', SESSION_ID);
        
        metrics.requestStart = Date.now();
        console.log('\nTimeline:');
        console.log(`[0ms] Request started`);

        const req = http.request(options, (res) => {
            let buffer = '';
            let eventCount = 0;

            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    if (line.startsWith('event: ')) {
                        const eventType = line.slice(7);
                        eventCount++;
                        
                        // Look for data line
                        let dataLine = '';
                        for (let j = i + 1; j < lines.length; j++) {
                            if (lines[j].trim().startsWith('data: ')) {
                                dataLine = lines[j].trim();
                                i = j;
                                break;
                            }
                        }

                        if (dataLine) {
                            const now = Date.now();
                            const elapsed = now - metrics.requestStart;
                            
                            try {
                                const data = JSON.parse(dataLine.slice(6));
                                
                                switch (eventType) {
                                    case 'connected':
                                        console.log(`[${elapsed}ms] Connected to SSE stream`);
                                        break;
                                        
                                    case 'start':
                                        metrics.streamStartTime = now;
                                        console.log(`[${elapsed}ms] Stream started - Agent: ${data.agent}`);
                                        break;
                                        
                                    case 'token':
                                        metrics.totalTokens++;
                                        if (metrics.totalTokens === 1) {
                                            metrics.firstTokenTime = now;
                                            console.log(`[${elapsed}ms] First token received ⚡`);
                                        }
                                        metrics.lastTokenTime = now;
                                        break;
                                        
                                    case 'done':
                                        metrics.streamEndTime = now;
                                        console.log(`[${elapsed}ms] Stream completed`);
                                        break;
                                        
                                    case 'error':
                                        console.log(`[${elapsed}ms] Error: ${data.message}`);
                                        break;
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            });

            res.on('end', () => {
                const totalTime = metrics.streamEndTime - metrics.requestStart;
                const timeToFirstToken = metrics.firstTokenTime - metrics.requestStart;
                const timeToStreamStart = metrics.streamStartTime - metrics.requestStart;
                const streamingTime = metrics.streamEndTime - metrics.firstTokenTime;
                
                console.log('\n=== Performance Summary ===');
                console.log(`Total request time: ${totalTime}ms`);
                console.log(`Time to stream start: ${timeToStreamStart}ms`);
                console.log(`Time to first token: ${timeToFirstToken}ms`);
                console.log(`Streaming duration: ${streamingTime}ms`);
                console.log(`Total tokens: ${metrics.totalTokens}`);
                console.log(`Average token rate: ${(metrics.totalTokens / (streamingTime / 1000)).toFixed(1)} tokens/sec`);
                
                console.log('\n=== Delay Analysis ===');
                console.log(`Initial delay (request → stream start): ${timeToStreamStart}ms`);
                console.log(`Agent selection delay (stream start → first token): ${timeToFirstToken - timeToStreamStart}ms`);
                
                if (timeToStreamStart > 1000) {
                    console.log('\n⚠️  High initial delay detected!');
                    console.log('Possible causes:');
                    console.log('- Mem0 initialization or search');
                    console.log('- Session state loading');
                    console.log('- Cross-session memory retrieval');
                }
                
                if (timeToFirstToken - timeToStreamStart > 1000) {
                    console.log('\n⚠️  High agent processing delay detected!');
                    console.log('Possible causes:');
                    console.log('- LLM cold start');
                    console.log('- Context building');
                    console.log('- Memory retrieval timeout');
                }
                
                resolve();
            });

            res.on('error', reject);
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Run test
async function runTest() {
    try {
        // Warm-up request
        console.log('=== Warm-up Request ===');
        await testPerformance('Hello');
        
        console.log('\n\n=== Performance Test Request ===');
        
        // Reset metrics
        Object.keys(metrics).forEach(key => metrics[key] = 0);
        
        // Actual test
        await testPerformance('Tell me about the benefits of meditation');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();