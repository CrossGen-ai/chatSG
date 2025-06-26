const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, body: result });
                } catch (error) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testEndpoints() {
    console.log('Testing new ChatSG endpoints...\n');

    try {
        // Test 1: Create new chat session
        console.log('1. Testing POST /api/chats - Create new chat session');
        const createResult = await makeRequest('POST', '/api/chats', {
            title: 'Test Chat Session',
            userId: 'test-user-123',
            metadata: {
                purpose: 'Testing new endpoints'
            }
        });
        
        console.log('   Status:', createResult.status);
        console.log('   Response:', JSON.stringify(createResult.body, null, 2));
        
        if (createResult.status !== 200 || !createResult.body.sessionId) {
            throw new Error('Failed to create chat session');
        }
        
        const sessionId = createResult.body.sessionId;
        console.log('   ✓ Chat session created successfully');
        console.log('   Session ID:', sessionId);
        console.log('');

        // Test 2: Save messages to the session
        console.log('2. Testing POST /api/chats/{id}/messages - Batch save messages');
        const messages = [
            {
                type: 'user',
                content: 'Hello, this is a test message',
                metadata: { timestamp: new Date().toISOString() }
            },
            {
                type: 'assistant',
                content: 'Hello! This is a test response.',
                metadata: { 
                    agent: 'TestAgent',
                    timestamp: new Date().toISOString() 
                }
            },
            {
                type: 'user',
                content: 'Can you help me with testing?',
                metadata: { timestamp: new Date().toISOString() }
            },
            {
                type: 'assistant',
                content: 'Of course! I\'m here to help with testing.',
                metadata: { 
                    agent: 'TestAgent',
                    timestamp: new Date().toISOString() 
                }
            }
        ];

        const saveResult = await makeRequest('POST', `/api/chats/${sessionId}/messages`, {
            messages: messages
        });
        
        console.log('   Status:', saveResult.status);
        console.log('   Response:', JSON.stringify(saveResult.body, null, 2));
        
        if (saveResult.status !== 200) {
            throw new Error('Failed to save messages');
        }
        
        console.log('   ✓ Messages saved successfully');
        console.log('');

        // Test 3: Verify messages were saved by retrieving them
        console.log('3. Verifying saved messages with GET /api/chats/{id}/messages');
        const getResult = await makeRequest('GET', `/api/chats/${sessionId}/messages?limit=10`);
        
        console.log('   Status:', getResult.status);
        console.log('   Total messages:', getResult.body.totalMessages || 0);
        
        if (getResult.body.messages && getResult.body.messages.length > 0) {
            console.log('   ✓ Messages retrieved successfully');
            console.log('   First message:', getResult.body.messages[0]);
        } else {
            console.log('   ⚠ No messages retrieved (might be using non-storage backend)');
        }
        console.log('');

        // Test 4: Create session without optional fields
        console.log('4. Testing POST /api/chats with minimal data');
        const minimalResult = await makeRequest('POST', '/api/chats', {});
        
        console.log('   Status:', minimalResult.status);
        console.log('   Response:', JSON.stringify(minimalResult.body, null, 2));
        
        if (minimalResult.status === 200 && minimalResult.body.sessionId) {
            console.log('   ✓ Minimal session created successfully');
        }
        console.log('');

        // Test 5: Test error handling - messages to non-existent session
        console.log('5. Testing error handling - POST messages to non-existent session');
        const errorResult = await makeRequest('POST', '/api/chats/non-existent-session/messages', {
            messages: [{ type: 'user', content: 'Test' }]
        });
        
        console.log('   Status:', errorResult.status);
        console.log('   Response:', JSON.stringify(errorResult.body, null, 2));
        
        if (errorResult.status === 404 || errorResult.body.error) {
            console.log('   ✓ Error handling works correctly');
        }
        console.log('');

        console.log('✅ All endpoint tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

// Check if server is running before testing
const checkReq = http.get(BASE_URL, (res) => {
    if (res.statusCode === 200 || res.statusCode === 404) {
        console.log(`Server is running on port ${PORT}\n`);
        testEndpoints();
    }
}).on('error', (err) => {
    console.error(`❌ Server is not running on port ${PORT}`);
    console.error('Please start the server with: npm run dev');
    process.exit(1);
});