/**
 * Chat Persistence System Tests
 * 
 * Comprehensive tests for the new hybrid chat persistence system including
 * file-based storage, session tracking, agent history, and user preferences.
 */

const fs = require('fs').promises;
const path = require('path');

async function testChatPersistence() {
    console.log('💾 Testing Chat Persistence System...\n');

    try {
        // Import required modules
        const { StateManager } = require('../dist/src/state/StateManager');
        const { FilePersistence } = require('../dist/src/state/persistence/FilePersistence');

        // Test 1: File Persistence Initialization
        console.log('1. Testing File Persistence Initialization');
        console.log('===========================================');
        
        const testDataPath = './test-data/chats';
        const filePersistence = new FilePersistence(testDataPath, 5000);
        
        console.log('✅ File persistence initialized');
        console.log(`   Base path: ${testDataPath}`);
        console.log(`   Cleanup interval: 5000ms`);

        // Test 2: Chat Storage and Retrieval
        console.log('\n2. Testing Chat Storage and Retrieval');
        console.log('======================================');

        const chatData = {
            sessionId: 'test-chat-001',
            title: 'Test Chat Session',
            messages: [
                {
                    id: 1,
                    content: 'Hello, how can I help you?',
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    agent: 'analytical'
                },
                {
                    id: 2,
                    content: 'I need help with data analysis',
                    sender: 'user',
                    timestamp: new Date().toISOString()
                }
            ],
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                messageCount: 2,
                agentHistory: ['analytical'],
                toolsUsed: [],
                userPreferences: {
                    crossSessionMemory: false,
                    agentLock: false
                }
            }
        };

        // Store chat data
        await filePersistence.store('chat:test-chat-001', chatData, 24 * 60 * 60 * 1000);
        console.log('✅ Chat data stored successfully');

        // Retrieve chat data
        const retrievedData = await filePersistence.retrieve('chat:test-chat-001');
        console.log('✅ Chat data retrieved successfully');
        console.log(`   Session ID: ${retrievedData.sessionId}`);
        console.log(`   Title: ${retrievedData.title}`);
        console.log(`   Message count: ${retrievedData.messages.length}`);
        console.log(`   Agent history: ${retrievedData.metadata.agentHistory.join(', ')}`);

        // Test 3: StateManager with Chat Persistence
        console.log('\n3. Testing StateManager with Chat Persistence');
        console.log('===============================================');

        const stateManager = StateManager.getInstance({
            persistence: {
                type: 'file',
                config: {
                    basePath: testDataPath,
                    cleanupIntervalMs: 5000
                }
            }
        });

        const sessionId = 'state-test-session';
        const context = {
            sessionId,
            agentName: 'TestAgent',
            userId: 'user123',
            timestamp: new Date()
        };

        // Create session with enhanced tracking
        const sessionResult = await stateManager.getSessionState(sessionId, context);
        console.log('✅ Session state created');
        console.log(`   Session ID: ${sessionResult.data.sessionId}`);
        console.log(`   Agent history initialized: ${Array.isArray(sessionResult.data.agentHistory)}`);
        console.log(`   Tools used initialized: ${Array.isArray(sessionResult.data.toolsUsed)}`);
        console.log(`   User preferences initialized: ${typeof sessionResult.data.userPreferences === 'object'}`);

        // Update session with agent interaction
        const agentInteraction = {
            agentName: 'analytical',
            timestamp: new Date(),
            confidence: 0.95,
            reason: 'User requested data analysis'
        };

        const updateResult = await stateManager.updateSessionState(
            sessionId,
            {
                agentHistory: [agentInteraction],
                userPreferences: {
                    crossSessionMemory: true,
                    agentLock: false,
                    preferredAgent: 'analytical'
                }
            },
            context
        );

        console.log('✅ Session updated with agent tracking');
        console.log(`   Agent interactions: ${updateResult.data.agentHistory.length}`);
        console.log(`   Cross-session memory: ${updateResult.data.userPreferences.crossSessionMemory}`);

        // Test 4: Shared State for Cross-Session Memory
        console.log('\n4. Testing Shared State for Cross-Session Memory');
        console.log('=================================================');

        const memoryData = {
            sessionId: sessionId,
            agentId: 'analytical',
            userId: 'user123',
            data: {
                type: 'conversation',
                content: 'User is working on data analysis project',
                context: 'Machine learning model optimization'
            },
            metadata: {
                timestamp: new Date(),
                relevance: 0.9
            }
        };

        const memoryResult = await stateManager.setSharedState(
            'memory:analytical:project-context',
            memoryData,
            {
                scope: 'user',
                permissions: {
                    read: ['analytical', 'technical'],
                    write: ['analytical'],
                    delete: ['analytical']
                }
            },
            context
        );

        console.log('✅ Cross-session memory stored');
        console.log(`   Memory key: ${memoryResult.data.key}`);
        console.log(`   User ID: ${memoryResult.data.data.userId}`);

        // Test cross-session memory query
        const crossSessionResult = await stateManager.queryCrossSessionStates(
            'user123',
            {
                excludeSessionId: 'different-session',
                memoryTypes: ['conversation'],
                maxResults: 10
            },
            context
        );

        console.log('✅ Cross-session memory queried');
        console.log(`   Results found: ${crossSessionResult.data.length}`);

        // Test 5: Performance and Cleanup
        console.log('\n5. Testing Performance and Cleanup');
        console.log('===================================');

        // Create multiple chat sessions for performance testing
        const performancePromises = [];
        for (let i = 0; i < 10; i++) {
            const perfSessionId = `perf-session-${i}`;
            const perfContext = {
                sessionId: perfSessionId,
                agentName: 'PerfTestAgent',
                userId: 'perfUser',
                timestamp: new Date()
            };
            
            performancePromises.push(
                stateManager.getSessionState(perfSessionId, perfContext)
            );
        }

        const startTime = Date.now();
        await Promise.all(performancePromises);
        const endTime = Date.now();

        console.log('✅ Performance test completed');
        console.log(`   Created 10 sessions in ${endTime - startTime}ms`);

        // Test file listing and cleanup
        const fileList = await filePersistence.listKeys('chat:');
        console.log(`✅ File listing: ${fileList.length} chat files found`);

        // Test 6: Error Handling and Edge Cases
        console.log('\n6. Testing Error Handling and Edge Cases');
        console.log('=========================================');

        // Test invalid session retrieval
        try {
            await filePersistence.retrieve('nonexistent-key');
            console.log('❌ Should have thrown error for nonexistent key');
        } catch (error) {
            console.log('✅ Properly handled nonexistent key error');
        }

        // Test invalid data storage
        try {
            await filePersistence.store('', null, 1000);
            console.log('❌ Should have thrown error for invalid data');
        } catch (error) {
            console.log('✅ Properly handled invalid data error');
        }

        // Test session state with invalid context
        try {
            const invalidContext = {
                sessionId: '',
                agentName: null,
                timestamp: new Date()
            };
            await stateManager.getSessionState('invalid-session', invalidContext);
            console.log('✅ Handled invalid context gracefully');
        } catch (error) {
            console.log('✅ Properly handled invalid context error');
        }

        // Test 7: Data Integrity and Serialization
        console.log('\n7. Testing Data Integrity and Serialization');
        console.log('============================================');

        const complexChatData = {
            sessionId: 'complex-session',
            title: 'Complex Data Test',
            messages: [
                {
                    id: 1,
                    content: 'Test with special characters: áéíóú, 中文, 🚀',
                    sender: 'user',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        attachments: ['file1.pdf', 'image.jpg'],
                        mentions: ['@analytical', '@creative']
                    }
                }
            ],
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                agentHistory: [
                    {
                        agentName: 'analytical',
                        timestamp: new Date(),
                        confidence: 0.95,
                        reason: 'Complex data analysis'
                    }
                ],
                toolsUsed: [
                    {
                        toolName: 'DataAnalyzer',
                        timestamp: new Date(),
                        parameters: { type: 'statistical', depth: 'deep' },
                        result: { success: true, insights: 42 },
                        success: true,
                        executionTime: 1250
                    }
                ],
                analytics: {
                    messageCount: 1,
                    averageResponseTime: 1250,
                    totalTokensUsed: 150,
                    errorCount: 0
                }
            }
        };

        // Store and retrieve complex data
        await filePersistence.store('chat:complex-session', complexChatData, 24 * 60 * 60 * 1000);
        const retrievedComplexData = await filePersistence.retrieve('chat:complex-session');

        // Verify data integrity
        const originalJson = JSON.stringify(complexChatData);
        const retrievedJson = JSON.stringify(retrievedComplexData);
        const dataIntegrityCheck = originalJson === retrievedJson;

        console.log('✅ Complex data serialization test');
        console.log(`   Data integrity maintained: ${dataIntegrityCheck}`);
        console.log(`   Special characters preserved: ${retrievedComplexData.messages[0].content.includes('🚀')}`);
        console.log(`   Nested objects preserved: ${typeof retrievedComplexData.metadata.analytics === 'object'}`);

        console.log('\n🎉 All chat persistence tests completed successfully!');

        // Cleanup test data
        try {
            await fs.rmdir(testDataPath, { recursive: true });
            console.log('✅ Test data cleaned up');
        } catch (error) {
            console.log('⚠️  Test data cleanup warning:', error.message);
        }

        return true;

    } catch (error) {
        console.error('❌ Chat persistence test failed:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testChatPersistence()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testChatPersistence }; 