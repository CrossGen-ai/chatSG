const http = require('http');

console.log('=== Detailed Delay Tracing ===\n');

// Simple message that should process quickly
const postData = JSON.stringify({
    message: 'Hi',
    sessionId: 'trace-test-' + Date.now(),
    activeSessionId: 'trace-test-' + Date.now()
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
const events = [];

console.log('[0ms] Starting request...');

const req = http.request(options, (res) => {
    console.log(`[${Date.now() - startTime}ms] Response received, status: ${res.statusCode}`);
    
    let buffer = '';
    
    res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (line.startsWith('event: ')) {
                const event = line.slice(7);
                const elapsed = Date.now() - startTime;
                events.push({ event, elapsed });
                console.log(`[${elapsed}ms] Event: ${event}`);
            }
        }
    });
    
    res.on('end', () => {
        const totalTime = Date.now() - startTime;
        console.log(`[${totalTime}ms] Response ended`);
        
        console.log('\n=== Event Timeline Analysis ===');
        
        // Analyze delays between events
        for (let i = 1; i < events.length; i++) {
            const prev = events[i-1];
            const curr = events[i];
            const delay = curr.elapsed - prev.elapsed;
            
            if (delay > 500) {
                console.log(`⚠️  ${delay}ms delay between "${prev.event}" and "${curr.event}"`);
            }
        }
        
        // Key metrics
        const connectedEvent = events.find(e => e.event === 'connected');
        const startEvent = events.find(e => e.event === 'start');
        const firstToken = events.find(e => e.event === 'token');
        
        console.log('\n=== Key Delays ===');
        if (connectedEvent && startEvent) {
            const initDelay = startEvent.elapsed - connectedEvent.elapsed;
            console.log(`Initial processing: ${initDelay}ms (connected → start)`);
            if (initDelay > 1000) {
                console.log('  Likely causes:');
                console.log('  - Session initialization');
                console.log('  - Storage manager setup');
                console.log('  - Mem0 initialization');
            }
        }
        
        if (startEvent && firstToken) {
            const agentDelay = firstToken.elapsed - startEvent.elapsed;
            console.log(`Agent processing: ${agentDelay}ms (start → first token)`);
            if (agentDelay > 1000) {
                console.log('  Likely causes:');
                console.log('  - Mem0 context retrieval (2s timeout)');
                console.log('  - LLM API call');
                console.log('  - Context building');
            }
        }
        
        // Check server logs suggestion
        console.log('\n💡 Check server logs for detailed timing:');
        console.log('   Look for: [BaseAgent] Context retrieval completed');
        console.log('   Look for: [BaseAgent] Mem0 context retrieval timed out');
        console.log('   Look for: [ORCHESTRATOR] Processing with streaming');
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.write(postData);
req.end();