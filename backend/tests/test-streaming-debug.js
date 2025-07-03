const http = require('http');

console.log('=== ChatSG Streaming Debug Test ===\n');

// Test configuration
const PORT = 3000;
const HOST = 'localhost';
const SESSION_ID = 'test-debug-' + Date.now();

// Function to send streaming request
function testStreaming(message) {
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

        console.log(`Sending: "${message}"`);
        console.log('Request options:', options);
        console.log('Request body:', postData);
        console.log('\nResponse events:');
        console.log('---');

        const req = http.request(options, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log(`Headers:`, res.headers);
            console.log('\nStreaming data:');
            console.log('---');

            let buffer = '';
            let eventCount = 0;
            let tokenCount = 0;
            let emptyTokenCount = 0;
            let totalChars = 0;

            res.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                console.log('RAW CHUNK:', JSON.stringify(chunkStr));
                
                buffer += chunkStr;
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
                            try {
                                const data = JSON.parse(dataLine.slice(6));
                                console.log(`[${eventCount}] Event: ${eventType}`);
                                
                                if (eventType === 'token') {
                                    tokenCount++;
                                    if (!data.content || data.content === '') {
                                        emptyTokenCount++;
                                        console.log(`    Token #${tokenCount}: [EMPTY]`);
                                    } else {
                                        totalChars += data.content.length;
                                        console.log(`    Token #${tokenCount}: "${data.content}" (${data.content.length} chars)`);
                                    }
                                } else {
                                    console.log(`    Data:`, JSON.stringify(data, null, 2));
                                }
                            } catch (e) {
                                console.log(`    Raw data: ${dataLine}`);
                            }
                        }
                    }
                }
            });

            res.on('end', () => {
                console.log('\n---');
                console.log('Stream ended');
                console.log(`\nSummary:`);
                console.log(`- Total events: ${eventCount}`);
                console.log(`- Total tokens: ${tokenCount}`);
                console.log(`- Empty tokens: ${emptyTokenCount}`);
                console.log(`- Total characters: ${totalChars}`);
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
        // Test with a simple message
        await testStreaming('Tell me a very short joke.');
        
        console.log('\n=== Test completed ===');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();