/**
 * Test cross-session memory through API flow
 * Simulates creating a new chat and asking "What is my name?"
 */

require('dotenv').config({ path: '../.env' });
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const USER_ID = 2;

// Mock authentication by adding auth headers
const authHeaders = {
    'x-user-id': USER_ID,
    'x-authenticated': 'true'
};

async function testCrossSessionMemory() {
    console.log('=== Cross-Session Memory API Test ===');
    console.log('Testing if "What is my name?" retrieves stored user info\n');

    try {
        // Step 1: Create a new chat session
        console.log('1️⃣ Creating new chat session...');
        const createResponse = await axios.post(`${API_BASE}/api/chats`, {
            title: 'Memory Test Chat',
            metadata: {}
        }, {
            headers: {
                ...authHeaders,
                'Content-Type': 'application/json'
            }
        });

        const sessionId = createResponse.data.sessionId || createResponse.data.session?.id;
        console.log(`   ✓ Created session: ${sessionId}\n`);

        // Step 2: Send "What is my name?" via SSE
        console.log('2️⃣ Sending "What is my name?" to the chat...');
        
        const result = await new Promise(async (resolve, reject) => {
            try {
                // POST request with SSE response
                const response = await axios({
                    method: 'POST',
                    url: `${API_BASE}/api/chat/stream`,
                    data: {
                        message: 'What is my name?',
                        sessionId: sessionId,
                        activeSessionId: sessionId
                    },
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    responseType: 'stream'
                });

                let fullResponse = '';
                let foundName = false;
                
                console.log('   ✓ Connected to SSE stream');

                // Process the SSE stream
                response.data.on('data', (chunk) => {
                    const lines = chunk.toString().split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.type === 'token' && data.content) {
                                    fullResponse += data.content;
                                    process.stdout.write(data.content);
                                } else if (data.type === 'done') {
                                    console.log('\n\n3️⃣ Analyzing response...');
                                    
                                    // Check if the response contains "Sean"
                                    const responseLower = fullResponse.toLowerCase();
                                    foundName = responseLower.includes('sean');
                                    
                                    console.log(`   Full response: "${fullResponse}"`);
                                    console.log(`   Contains "Sean": ${foundName ? '✅ YES' : '❌ NO'}`);
                                    
                                    resolve({ fullResponse, foundName });
                                } else if (data.type === 'error') {
                                    console.error('\n   ❌ Error:', data.message || data.error);
                                    reject(new Error(data.message || data.error));
                                }
                            } catch (err) {
                                // Ignore parse errors for non-JSON lines
                            }
                        }
                    }
                });

                response.data.on('error', (err) => {
                    console.error('\n   ❌ Stream error:', err);
                    reject(err);
                });

                // Timeout after 30 seconds
                setTimeout(() => {
                    reject(new Error('Timeout waiting for response'));
                }, 30000);
                
            } catch (err) {
                console.error('   ❌ Failed to send message:', err.message);
                reject(err);
            }
        });
        
        console.log('\n=== TEST RESULTS ===');
        if (result.foundName) {
            console.log('✅ SUCCESS: Cross-session memory is working!');
            console.log('   The system remembered the name "Sean" from previous sessions.');
        } else {
            console.log('❌ FAILURE: Cross-session memory is not working.');
            console.log('   The system did not retrieve the stored name.');
            console.log('\nPossible issues:');
            console.log('   - Memory not properly indexed in Qdrant');
            console.log('   - User ID mismatch');
            console.log('   - Memory retrieval timeout');
            console.log('   - No previous sessions with "My name is Sean"');
        }

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

// Check if required modules are installed
try {
    require('axios');
} catch (err) {
    console.error('❌ Missing dependencies. Please run:');
    console.error('   npm install axios');
    process.exit(1);
}

// Run the test
testCrossSessionMemory()
    .then(() => {
        console.log('\n=== Test Complete ===');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n=== Test Failed ===');
        console.error(err);
        process.exit(1);
    });