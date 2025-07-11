#!/usr/bin/env node

/**
 * Test script for Python-based Mem0 service
 */

const axios = require('axios');
require('dotenv').config();

const PYTHON_SERVICE_URL = process.env.MEM0_PYTHON_SERVICE_URL || 'http://localhost:8001';

async function testPythonService() {
    console.log('=== Testing Python Mem0 Service ===\n');
    console.log(`Service URL: ${PYTHON_SERVICE_URL}`);
    console.log(`Current provider: ${process.env.MEM0_MODELS}`);
    console.log('');

    try {
        // 1. Check health
        console.log('1. Testing health endpoint...');
        const health = await axios.get(`${PYTHON_SERVICE_URL}/health`);
        console.log('✅ Health check:', health.data);
        console.log('');

        // 2. Check config
        console.log('2. Testing config endpoint...');
        const config = await axios.get(`${PYTHON_SERVICE_URL}/config`);
        console.log('✅ Configuration:', config.data);
        console.log('');

        // 3. Test adding messages
        console.log('3. Testing add messages...');
        const messages = [
            {
                id: 'test-1',
                type: 'user',
                content: 'My name is Test User and I work at Acme Corp',
                timestamp: new Date().toISOString()
            },
            {
                id: 'test-2',
                type: 'assistant',
                content: 'Nice to meet you, Test User from Acme Corp!',
                timestamp: new Date().toISOString()
            }
        ];

        const addResult = await axios.post(`${PYTHON_SERVICE_URL}/add`, {
            messages: messages,
            session_id: 'test-session-123',
            user_id: 999
        });
        console.log('✅ Added messages:', addResult.data.success ? 'Success' : 'Failed');
        console.log('');

        // 4. Test search
        console.log('4. Testing search...');
        const searchResult = await axios.post(`${PYTHON_SERVICE_URL}/search`, {
            query: 'What company does the user work at?',
            user_id: 999,
            limit: 5
        });
        console.log('✅ Search results:', searchResult.data.results?.length || 0, 'memories found');
        if (searchResult.data.results?.length > 0) {
            console.log('First result:', searchResult.data.results[0]);
        }
        console.log('');

        // 5. Test get session memories
        console.log('5. Testing get session memories...');
        const sessionMemories = await axios.post(`${PYTHON_SERVICE_URL}/get-session-memories`, {
            session_id: 'test-session-123',
            user_id: 999
        });
        console.log('✅ Session memories:', sessionMemories.data.memories?.length || 0, 'memories found');
        console.log('');

        // 6. Test TypeScript Mem0Service integration
        console.log('6. Testing TypeScript Mem0Service integration...');
        const { getMem0Service } = require('../dist/src/memory/Mem0Service');
        const mem0Service = getMem0Service();
        
        await mem0Service.initialize();
        console.log('✅ TypeScript Mem0Service initialized successfully');
        
        // Add a message through TypeScript service
        const tsMessage = {
            id: 'ts-test-1',
            type: 'user',
            content: 'Testing from TypeScript service',
            timestamp: new Date().toISOString()
        };
        
        await mem0Service.addMessage(tsMessage, 'test-session-456', 999);
        console.log('✅ Added message through TypeScript service');
        
        console.log('\n✅ All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\n⚠️  Python service is not running!');
            console.error('Start it with: cd backend/python-mem0 && ./scripts/start.sh');
        } else if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
testPythonService().then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
}).catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});