#!/usr/bin/env node

/**
 * Test script for PostgreSQL storage implementation
 * Tests the new PostgreSQL-based session storage to ensure it works correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Set storage backend to postgres
process.env.STORAGE_BACKEND = 'postgres';

// Make sure we're using the Docker PostgreSQL database
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5433';
process.env.POSTGRES_USER = 'postgres';
process.env.POSTGRES_PASSWORD = 'postgres123';
process.env.POSTGRES_DB = 'chatsg';

const { getStorageManager } = require('../dist/src/storage/StorageManager');
const { performance } = require('perf_hooks');

async function runTests() {
    console.log('🧪 Testing PostgreSQL Storage Implementation\n');
    
    const storageManager = getStorageManager();
    
    try {
        // Initialize storage
        console.log('1️⃣ Initializing storage manager...');
        const initStart = performance.now();
        await storageManager.initialize();
        const initTime = performance.now() - initStart;
        console.log(`✓ Storage initialized in ${initTime.toFixed(2)}ms\n`);
        
        // Create a test user first
        const { Pool } = require('pg');
        const pool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: process.env.POSTGRES_PORT,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
        });
        
        try {
            await pool.query(`
                INSERT INTO users (id, azure_id, email, name, created_at)
                VALUES (1, 'test-azure-id', 'test@example.com', 'Test User', NOW())
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ Test user created\n');
        } catch (error) {
            console.log('User creation failed (may already exist):', error.message);
        } finally {
            await pool.end();
        }
        
        // Test 1: Create a new session
        console.log('2️⃣ Creating new session...');
        const createStart = performance.now();
        const session = await storageManager.createSession({
            title: 'PostgreSQL Test Session',
            userId: '1',
            metadata: {
                testRun: true,
                timestamp: new Date().toISOString()
            }
        });
        const createTime = performance.now() - createStart;
        console.log(`✓ Session created: ${session.sessionId} in ${createTime.toFixed(2)}ms`);
        console.log(`  Title: ${session.title}`);
        console.log(`  Status: ${session.status}\n`);
        
        // Test 2: Add messages
        console.log('3️⃣ Adding messages...');
        const messages = [
            { type: 'user', content: 'Hello, testing PostgreSQL storage!' },
            { type: 'assistant', content: 'Hello! PostgreSQL storage is working.', metadata: { agent: 'technical' } },
            { type: 'user', content: 'How fast is it compared to JSONL?' },
            { type: 'assistant', content: 'Much faster for queries and concurrent access!', metadata: { agent: 'technical' } }
        ];
        
        const messageStart = performance.now();
        for (const msg of messages) {
            await storageManager.saveMessage({
                sessionId: session.sessionId,
                type: msg.type,
                content: msg.content,
                metadata: msg.metadata
            });
        }
        const messageTime = performance.now() - messageStart;
        console.log(`✓ Added ${messages.length} messages in ${messageTime.toFixed(2)}ms`);
        console.log(`  Average per message: ${(messageTime / messages.length).toFixed(2)}ms\n`);
        
        // Test 3: Read messages back
        console.log('4️⃣ Reading messages...');
        const readStart = performance.now();
        const readMessages = await storageManager.getMessages(session.sessionId);
        const readTime = performance.now() - readStart;
        console.log(`✓ Read ${readMessages.length} messages in ${readTime.toFixed(2)}ms`);
        readMessages.forEach((msg, i) => {
            console.log(`  ${i + 1}. [${msg.type}]: ${msg.content.substring(0, 50)}...`);
        });
        console.log();
        
        // Test 4: List sessions
        console.log('5️⃣ Listing sessions...');
        const listStart = performance.now();
        const sessions = await storageManager.listSessions({
            userId: '1',
            status: 'active'
        });
        const listTime = performance.now() - listStart;
        console.log(`✓ Found ${sessions.length} active sessions in ${listTime.toFixed(2)}ms`);
        sessions.forEach(s => {
            console.log(`  - ${s.sessionId}: ${s.title} (${s.messageCount} messages)`);
        });
        console.log();
        
        // Test 5: Search messages
        console.log('6️⃣ Testing message search...');
        const searchStart = performance.now();
        const searchResults = await storageManager.sessionStorage.searchMessages(
            '1',
            'PostgreSQL',
            10
        );
        const searchTime = performance.now() - searchStart;
        console.log(`✓ Search completed in ${searchTime.toFixed(2)}ms`);
        console.log(`  Found ${searchResults.length} messages containing "PostgreSQL"\n`);
        
        // Test 6: Update session
        console.log('7️⃣ Updating session...');
        const updateStart = performance.now();
        await storageManager.updateSessionTitle(session.sessionId, 'PostgreSQL Test - Updated');
        await storageManager.updateSessionStatus(session.sessionId, 'inactive');
        const updateTime = performance.now() - updateStart;
        console.log(`✓ Session updated in ${updateTime.toFixed(2)}ms\n`);
        
        // Test 7: Tool logging
        console.log('8️⃣ Testing tool execution logging...');
        const toolStart = performance.now();
        await storageManager.logToolExecution({
            sessionId: session.sessionId,
            toolName: 'database_query',
            parameters: { query: 'SELECT * FROM users' },
            result: { rows: 10, time: '5ms' },
            success: true,
            timestamp: new Date().toISOString(),
            executionTime: 5
        });
        const toolTime = performance.now() - toolStart;
        console.log(`✓ Tool execution logged in ${toolTime.toFixed(2)}ms\n`);
        
        // Test 8: Get statistics
        console.log('9️⃣ Getting statistics...');
        const statsStart = performance.now();
        const stats = await storageManager.getStatistics();
        const statsTime = performance.now() - statsStart;
        console.log(`✓ Statistics retrieved in ${statsTime.toFixed(2)}ms`);
        console.log(`  Total sessions: ${stats.sessions.total}`);
        console.log(`  Active sessions: ${stats.sessions.active}`);
        console.log(`  Active streams: ${stats.activeStreams}\n`);
        
        // Performance summary
        console.log('📊 Performance Summary:');
        console.log('─'.repeat(40));
        const totalTime = initTime + createTime + messageTime + readTime + 
                         listTime + searchTime + updateTime + toolTime + statsTime;
        console.log(`Total execution time: ${totalTime.toFixed(2)}ms`);
        console.log(`Average operation time: ${(totalTime / 9).toFixed(2)}ms`);
        console.log();
        
        console.log('✅ All PostgreSQL storage tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests().then(() => {
    console.log('\n✨ PostgreSQL storage implementation is working correctly!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});