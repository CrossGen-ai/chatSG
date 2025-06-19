"use strict";
// Test script for backend routing
const axios = require('axios');
async function testBackend() {
    console.log('=== Backend Routing Test ===');
    const testMessage = {
        message: "Hello, testing backend routing!",
        sessionId: "test-session-123"
    };
    try {
        console.log('📤 Sending test message...');
        const response = await axios.post('http://localhost:3000/api/chat', testMessage, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Response received:');
        console.log('📥 Message:', response.data.message);
        console.log('🔧 Backend:', response.data._backend);
        console.log('📊 Full response:', JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}
testBackend();
//# sourceMappingURL=test-backend.js.map