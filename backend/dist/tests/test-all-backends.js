"use strict";
// Comprehensive test for all backend modes
const axios = require('axios');
async function testBackendMode(backend, description) {
    console.log(`\n=== Testing ${backend} Backend ===`);
    console.log(`Description: ${description}`);
    const testMessage = {
        message: `Hello from ${backend} backend test!`,
        sessionId: `test-session-${backend.toLowerCase()}`
    };
    try {
        console.log('📤 Sending test message...');
        const response = await axios.post('http://localhost:3000/api/chat', testMessage, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        console.log('✅ Response received:');
        console.log('📥 Message:', response.data.message.substring(0, 100) + '...');
        console.log('🔧 Backend:', response.data._backend || 'Not specified');
        console.log('📊 Response keys:', Object.keys(response.data));
        return true;
    }
    catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return false;
    }
}
async function runAllTests() {
    console.log('=== ChatSG Backend Routing Tests ===');
    console.log('Testing current server configuration...\n');
    // Test current configuration (should be Generic based on .env)
    const currentTest = await testBackendMode('Current', 'Testing current server configuration');
    if (!currentTest) {
        console.log('\n❌ Server appears to be down. Please start the server first:');
        console.log('cd backend && node server.js');
        return;
    }
    console.log('\n=== Backend Mode Information ===');
    console.log('To test different backends, update the .env file:');
    console.log('');
    console.log('1. Generic Mode (Development Simulation):');
    console.log('   BACKEND=Generic');
    console.log('   - Uses simulated responses');
    console.log('   - No external dependencies');
    console.log('');
    console.log('2. n8n Mode (Production Webhook):');
    console.log('   BACKEND=n8n');
    console.log('   - Forwards to webhook URL');
    console.log('   - Requires WEBHOOK_URL in .env');
    console.log('');
    console.log('3. Lang Mode (LangGraph Agent):');
    console.log('   BACKEND=Lang');
    console.log('   - Uses AgentZero LangGraph agent');
    console.log('   - Requires AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT');
    console.log('');
    console.log('Current .env file should contain:');
    console.log('ENVIRONMENT=dev');
    console.log('BACKEND=Generic');
    console.log('');
    console.log('Restart the server after changing .env file.');
}
runAllTests();
//# sourceMappingURL=test-all-backends.js.map