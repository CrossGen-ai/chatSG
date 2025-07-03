const http = require('http');

console.log('=== Timing Test - Single Message ===\n');

const postData = JSON.stringify({
    message: 'What is 2+2?',
    sessionId: 'timing-test-' + Date.now(),
    activeSessionId: 'timing-test-' + Date.now()
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat/stream',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const startTime = Date.now();
console.log('[0ms] Starting request...');

const req = http.request(options, (res) => {
    console.log(`[${Date.now() - startTime}ms] Response received, status: ${res.statusCode}`);
    
    let buffer = '';
    let firstToken = false;
    
    res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (line.startsWith('event: ')) {
                const event = line.slice(7);
                console.log(`[${Date.now() - startTime}ms] Event: ${event}`);
                
                if (event === 'token' && !firstToken) {
                    firstToken = true;
                    console.log(`[${Date.now() - startTime}ms] ⚡ FIRST TOKEN!`);
                }
            }
        }
    });
    
    res.on('end', () => {
        console.log(`[${Date.now() - startTime}ms] Response ended`);
        console.log('\nTotal time:', Date.now() - startTime, 'ms');
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.write(postData);
req.end();