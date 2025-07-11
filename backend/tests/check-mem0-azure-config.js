#!/usr/bin/env node

/**
 * Test script to verify Mem0 configuration for both OpenAI and Azure
 * Run with: node tests/check-mem0-azure-config.js
 */

require('dotenv').config();

console.log('=== Mem0 Azure/OpenAI Configuration Check ===\n');

// Check current provider setting
const provider = process.env.MEM0_MODELS;
console.log(`Current MEM0_MODELS: ${provider || 'NOT SET'}`);
console.log(`Current CHAT_MODELS: ${process.env.CHAT_MODELS || 'NOT SET'}`);
console.log('');

// Check OpenAI configuration
console.log('--- OpenAI Configuration ---');
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`MEM0_LLM_MODEL: ${process.env.MEM0_LLM_MODEL || 'NOT SET'}`);
console.log(`MEM0_EMBEDDING_MODEL: ${process.env.MEM0_EMBEDDING_MODEL || 'NOT SET'}`);
console.log('');

// Check Azure configuration
console.log('--- Azure Configuration ---');
console.log(`AZURE_OPENAI_API_KEY: ${process.env.AZURE_OPENAI_API_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`AZURE_OPENAI_ENDPOINT: ${process.env.AZURE_OPENAI_ENDPOINT || 'NOT SET'}`);
console.log(`AZURE_OPENAI_DEPLOYMENT: ${process.env.AZURE_OPENAI_DEPLOYMENT || 'NOT SET'}`);
console.log(`AZURE_OPENAI_EMBEDDING_DEPLOYMENT: ${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'NOT SET'}`);
console.log(`AZURE_OPENAI_API_VERSION: ${process.env.AZURE_OPENAI_API_VERSION || 'NOT SET (default: 2024-02-15-preview)'}`);
console.log('');

// Check vector store configuration
console.log('--- Vector Store Configuration ---');
console.log(`MEM0_PROVIDER: ${process.env.MEM0_PROVIDER || 'NOT SET'}`);
console.log(`QDRANT_URL: ${process.env.QDRANT_URL || 'NOT SET'}`);
console.log('');

// Test instantiation
console.log('--- Testing Mem0Service Instantiation ---');
try {
    const { getMem0Service } = require('../dist/src/memory/Mem0Service');
    const mem0Service = getMem0Service();
    console.log('✓ Mem0Service instantiated successfully');
    
    // Try to initialize
    console.log('Attempting to initialize...');
    mem0Service.initialize()
        .then(() => {
            console.log('✓ Mem0Service initialized successfully!');
            console.log(`✓ Provider: ${provider}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('✗ Initialization failed:', error.message);
            process.exit(1);
        });
} catch (error) {
    console.error('✗ Failed to instantiate Mem0Service:', error.message);
    console.error('\nDetailed error:');
    console.error(error);
    process.exit(1);
}