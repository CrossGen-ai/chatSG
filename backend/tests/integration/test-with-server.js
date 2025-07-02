const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const API_BASE = 'http://localhost:3000';

// Function to wait for server to be ready
async function waitForServer(url, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await axios.get(url);
            return true;
        } catch (error) {
            console.log(`   Waiting for server... (${i + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
}

// Function to run tests
async function runTests() {
    console.log('🧪 Testing Simplified Chat Flow\n');
    
    try {
        // Test 1: Get initial chat list
        console.log('1️⃣ Getting initial chat list...');
        const { data: initialList } = await axios.get(`${API_BASE}/api/chats`);
        console.log(`   ✅ Found ${initialList.chats.length} existing chats`);
        
        // Test 2: Send a message with a new session ID (should auto-create session)
        const newSessionId = `test-session-${Date.now()}`;
        const testMessage = 'Hello, this is a test message for the simplified flow!';
        
        console.log(`\n2️⃣ Sending message with new session ID: ${newSessionId}`);
        console.log(`   Message: "${testMessage}"`);
        
        try {
            const { data: chatResponse } = await axios.post(`${API_BASE}/api/chat`, {
                message: testMessage,
                sessionId: newSessionId,
                userId: 'test-user'
            }, {
                timeout: 5000 // 5 second timeout
            });
            
            console.log(`   ✅ Got response: "${chatResponse.message}"`);
        } catch (error) {
            console.error('   ❌ Failed to send message:', error.message);
            if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
                console.error('   Server crashed while handling the request!');
                return false;
            }
            throw error;
        }
        
        // Test 3: Verify session was auto-created
        console.log('\n3️⃣ Verifying session was auto-created...');
        const { data: updatedList } = await axios.get(`${API_BASE}/api/chats`);
        const newSession = updatedList.chats.find(chat => 
            chat.id === newSessionId || chat.file?.includes(newSessionId)
        );
        
        if (newSession) {
            console.log(`   ✅ Session auto-created successfully!`);
            console.log(`   Title: "${newSession.title}"`);
            console.log(`   Message count: ${newSession.messageCount}`);
        } else {
            console.log(`   ❌ Session was not created`);
            return false;
        }
        
        // Test 4: Get messages from the session
        console.log('\n4️⃣ Getting messages from the session...');
        const { data: messages } = await axios.get(`${API_BASE}/api/chats/${newSessionId}/messages`);
        console.log(`   ✅ Found ${messages.messages.length} messages`);
        
        // Test 5: Clean up
        console.log('\n5️⃣ Cleaning up - deleting test session...');
        await axios.delete(`${API_BASE}/api/chats/${newSessionId}`);
        console.log(`   ✅ Test session deleted`);
        
        console.log('\n✅ All tests passed!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        return false;
    }
}

// Main function to start server and run tests
async function main() {
    console.log('🚀 Starting backend server...\n');
    
    // Start the server
    const serverProcess = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let serverOutput = '';
    let serverError = '';
    
    // Capture server output
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log('   [SERVER]', output.trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        serverError += error;
        console.error('   [SERVER ERROR]', error.trim());
    });
    
    serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
    
    try {
        // Wait for server to be ready
        console.log('\n⏳ Waiting for server to be ready...');
        const serverReady = await waitForServer(`${API_BASE}/api/chats`);
        
        if (!serverReady) {
            console.error('❌ Server failed to start within timeout');
            console.error('\nServer output:', serverOutput);
            console.error('\nServer errors:', serverError);
            process.exit(1);
        }
        
        console.log('✅ Server is ready!\n');
        
        // Run tests
        const testsPassed = await runTests();
        
        if (!testsPassed) {
            console.error('\n📋 Server output during tests:');
            console.error(serverOutput);
            if (serverError) {
                console.error('\n📋 Server errors during tests:');
                console.error(serverError);
            }
        }
        
        // Exit with appropriate code
        process.exit(testsPassed ? 0 : 1);
        
    } finally {
        // Clean up: kill the server
        console.log('\n🛑 Stopping server...');
        serverProcess.kill();
    }
}

// Run the main function
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});