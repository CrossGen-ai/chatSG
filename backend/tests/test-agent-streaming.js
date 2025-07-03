#!/usr/bin/env node

// Direct test of agent streaming functionality
const path = require('path');

// Set up environment
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-key-here';
process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

console.log('Testing Agent Streaming Directly...\n');

async function testAgentStreaming() {
    try {
        // Load the agent
        const { AnalyticalAgent } = require('../dist/src/agents/individual/analytical');
        
        const agent = new AnalyticalAgent();
        await agent.initialize();
        
        console.log('[TEST] Agent initialized');
        
        // Create a streaming callback
        let streamedContent = '';
        const streamCallback = (token) => {
            console.log(`[STREAM] Token: "${token}"`);
            streamedContent += token;
        };
        
        console.log('[TEST] Calling processMessage with streamCallback...');
        console.log('[TEST] streamCallback type:', typeof streamCallback);
        
        // Call the agent
        const result = await agent.processMessage(
            'Hello, how are you?',
            'test-agent-stream-' + Date.now(),
            streamCallback
        );
        
        console.log('\n[TEST] Result:', {
            success: result.success,
            messageLength: result.message.length,
            metadata: result.metadata
        });
        
        console.log('\n[TEST] Streamed content length:', streamedContent.length);
        console.log('[TEST] Full streamed content:', streamedContent);
        
        if (streamedContent.length === 0) {
            console.error('\n[ERROR] No content was streamed! Agent is not using streaming mode.');
            process.exit(1);
        } else {
            console.log('\n[SUCCESS] Agent streaming is working!');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('[ERROR]', error);
        process.exit(1);
    }
}

// Run the test
testAgentStreaming();