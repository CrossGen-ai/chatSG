/**
 * Test that stores "My name is Sean" first, then creates a new chat and asks "What is my name?"
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

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessageAndWait(sessionId, message) {
    console.log(`   Sending: "${message}"`);
    
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios({
                method: 'POST',
                url: `${API_BASE}/api/chat/stream`,
                data: {
                    message: message,
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
                                console.log('\n');
                                resolve(fullResponse);
                            } else if (data.type === 'error') {
                                reject(new Error(data.message || data.error));
                            }
                        } catch (err) {
                            // Ignore parse errors
                        }
                    }
                }
            });

            response.data.on('error', reject);
            
            setTimeout(() => reject(new Error('Timeout')), 30000);
            
        } catch (err) {
            reject(err);
        }
    });
}

async function testStoreAndRetrieve() {
    console.log('=== Store Then Retrieve Memory Test ===\n');

    try {
        // Step 1: Create first session and store name
        console.log('1️⃣ Creating first session to store personal info...');
        const session1Response = await axios.post(`${API_BASE}/api/chats`, {
            title: 'Store Name Session',
            metadata: {}
        }, {
            headers: {
                ...authHeaders,
                'Content-Type': 'application/json'
            }
        });

        const session1Id = session1Response.data.sessionId || session1Response.data.session?.id;
        console.log(`   ✓ Created session 1: ${session1Id}\n`);

        // Store personal information
        console.log('2️⃣ Storing personal information...');
        await sendMessageAndWait(session1Id, 'My name is Sean and I work at OpenAI');
        
        console.log('   ⏳ Waiting 5 seconds for memory indexing...\n');
        await delay(5000);

        // Step 2: Create new session and ask for name
        console.log('3️⃣ Creating NEW session to test memory retrieval...');
        const session2Response = await axios.post(`${API_BASE}/api/chats`, {
            title: 'Memory Retrieval Test',
            metadata: {}
        }, {
            headers: {
                ...authHeaders,
                'Content-Type': 'application/json'
            }
        });

        const session2Id = session2Response.data.sessionId || session2Response.data.session?.id;
        console.log(`   ✓ Created session 2: ${session2Id}\n`);

        console.log('4️⃣ Asking "What is my name?" in the new session...');
        const response = await sendMessageAndWait(session2Id, 'What is my name?');
        
        // Analyze results
        console.log('\n=== ANALYSIS ===');
        const responseLower = response.toLowerCase();
        const foundName = responseLower.includes('sean');
        const foundWorkplace = responseLower.includes('openai');
        
        console.log(`Response: "${response}"`);
        console.log(`Contains "Sean": ${foundName ? '✅ YES' : '❌ NO'}`);
        console.log(`Contains "OpenAI": ${foundWorkplace ? '✅ YES' : '❌ NO'}`);
        
        console.log('\n=== TEST RESULTS ===');
        if (foundName) {
            console.log('✅ SUCCESS: Cross-session memory is working!');
            console.log('   The system remembered your name across different sessions.');
            if (foundWorkplace) {
                console.log('   The system also remembered your workplace!');
            }
        } else {
            console.log('❌ FAILURE: Cross-session memory is not working.');
            console.log('   The system did not retrieve the stored name from the previous session.');
            console.log('\nDebugging tips:');
            console.log('   1. Check backend logs for memory retrieval timeouts');
            console.log('   2. Verify Qdrant is running and accessible');
            console.log('   3. Check if userId is consistent (should be 2)');
            console.log('   4. Look for errors in Mem0Service logs');
        }

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

// Run the test
testStoreAndRetrieve()
    .then(() => {
        console.log('\n=== Test Complete ===');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n=== Test Failed ===');
        console.error(err);
        process.exit(1);
    });