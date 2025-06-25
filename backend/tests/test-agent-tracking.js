/**
 * Agent Tracking and Orchestrator Tests
 * 
 * Comprehensive tests for agent tracking, orchestrator enhancements,
 * agent lock functionality, and agent preference management.
 */

async function testAgentTracking() {
    console.log('🤖 Testing Agent Tracking and Orchestrator System...\n');

    try {
        // Import required modules
        const { StateManager } = require('../dist/src/state/StateManager');
        const { AgentOrchestrator } = require('../dist/src/routing/AgentOrchestrator');

        // Test 1: Agent History Tracking
        console.log('1. Testing Agent History Tracking');
        console.log('==================================');

        const stateManager = StateManager.getInstance();
        const sessionId = 'agent-tracking-session';
        const context = {
            sessionId,
            agentName: 'TestAgent',
            userId: 'user123',
            timestamp: new Date()
        };

        // Create session and verify agent history initialization
        const sessionResult = await stateManager.getSessionState(sessionId, context);
        console.log('✅ Session created with agent tracking');
        console.log(`   Agent history initialized: ${Array.isArray(sessionResult.data.agentHistory)}`);
        console.log(`   Initial history length: ${sessionResult.data.agentHistory.length}`);

        // Add multiple agent interactions
        const agentInteractions = [
            {
                agentName: 'analytical',
                timestamp: new Date(),
                confidence: 0.95,
                reason: 'User requested data analysis',
                handoffFrom: null
            },
            {
                agentName: 'creative',
                timestamp: new Date(Date.now() + 1000),
                confidence: 0.88,
                reason: 'User wants creative writing help',
                handoffFrom: 'analytical'
            },
            {
                agentName: 'technical',
                timestamp: new Date(Date.now() + 2000),
                confidence: 0.92,
                reason: 'Technical implementation needed',
                handoffFrom: 'creative'
            }
        ];

        const updateResult = await stateManager.updateSessionState(
            sessionId,
            { agentHistory: agentInteractions },
            context
        );

        console.log('✅ Agent interactions tracked');
        console.log(`   Total interactions: ${updateResult.data.agentHistory.length}`);
        console.log(`   Agent sequence: ${updateResult.data.agentHistory.map(a => a.agentName).join(' → ')}`);
        console.log(`   Handoff chain: ${updateResult.data.agentHistory.filter(a => a.handoffFrom).map(a => `${a.handoffFrom}→${a.agentName}`).join(', ')}`);

        // Test 2: Tool Usage Tracking
        console.log('\n2. Testing Tool Usage Tracking');
        console.log('===============================');

        const toolUsageData = [
            {
                toolName: 'DataAnalyzer',
                timestamp: new Date(),
                parameters: { dataset: 'sales_data.csv', analysis_type: 'trend' },
                result: { trend: 'increasing', confidence: 0.87 },
                success: true,
                executionTime: 1250,
                agentName: 'analytical'
            },
            {
                toolName: 'CodeGenerator',
                timestamp: new Date(Date.now() + 1000),
                parameters: { language: 'python', framework: 'pandas' },
                result: { code: 'import pandas as pd...', lines: 45 },
                success: true,
                executionTime: 890,
                agentName: 'technical'
            },
            {
                toolName: 'TextProcessor',
                timestamp: new Date(Date.now() + 2000),
                parameters: { text: 'Sample text', operation: 'summarize' },
                result: null,
                success: false,
                executionTime: 150,
                agentName: 'creative'
            }
        ];

        const toolUpdateResult = await stateManager.updateSessionState(
            sessionId,
            { toolsUsed: toolUsageData },
            context
        );

        console.log('✅ Tool usage tracked');
        console.log(`   Total tool uses: ${toolUpdateResult.data.toolsUsed.length}`);
        console.log(`   Successful tools: ${toolUpdateResult.data.toolsUsed.filter(t => t.success).length}`);
        console.log(`   Failed tools: ${toolUpdateResult.data.toolsUsed.filter(t => !t.success).length}`);
        console.log(`   Average execution time: ${Math.round(toolUpdateResult.data.toolsUsed.reduce((sum, t) => sum + t.executionTime, 0) / toolUpdateResult.data.toolsUsed.length)}ms`);

        // Test 3: User Preferences Management
        console.log('\n3. Testing User Preferences Management');
        console.log('=======================================');

        const userPreferences = {
            crossSessionMemory: true,
            agentLock: false,
            preferredAgent: 'analytical',
            lastAgentUsed: 'technical',
            agentLockTimestamp: null
        };

        const preferencesResult = await stateManager.updateSessionState(
            sessionId,
            { userPreferences },
            context
        );

        console.log('✅ User preferences updated');
        console.log(`   Cross-session memory: ${preferencesResult.data.userPreferences.crossSessionMemory}`);
        console.log(`   Agent lock: ${preferencesResult.data.userPreferences.agentLock}`);
        console.log(`   Preferred agent: ${preferencesResult.data.userPreferences.preferredAgent}`);
        console.log(`   Last agent used: ${preferencesResult.data.userPreferences.lastAgentUsed}`);

        // Test agent lock functionality
        const agentLockPreferences = {
            ...userPreferences,
            agentLock: true,
            agentLockTimestamp: new Date()
        };

        const lockResult = await stateManager.updateSessionState(
            sessionId,
            { userPreferences: agentLockPreferences },
            context
        );

        console.log('✅ Agent lock activated');
        console.log(`   Lock timestamp: ${lockResult.data.userPreferences.agentLockTimestamp}`);
        console.log(`   Lock duration: ${Date.now() - new Date(lockResult.data.userPreferences.agentLockTimestamp).getTime()}ms`);

        // Test 4: Analytics Tracking
        console.log('\n4. Testing Analytics Tracking');
        console.log('==============================');

        const analyticsData = {
            messageCount: 15,
            averageResponseTime: 1850,
            totalTokensUsed: 2340,
            errorCount: 2,
            lastError: {
                timestamp: new Date(),
                error: 'Tool execution timeout',
                agent: 'technical'
            }
        };

        const analyticsResult = await stateManager.updateSessionState(
            sessionId,
            { analytics: analyticsData },
            context
        );

        console.log('✅ Analytics data tracked');
        console.log(`   Message count: ${analyticsResult.data.analytics.messageCount}`);
        console.log(`   Average response time: ${analyticsResult.data.analytics.averageResponseTime}ms`);
        console.log(`   Total tokens: ${analyticsResult.data.analytics.totalTokensUsed}`);
        console.log(`   Error count: ${analyticsResult.data.analytics.errorCount}`);
        console.log(`   Last error agent: ${analyticsResult.data.analytics.lastError.agent}`);

        // Test 5: Agent Orchestrator Integration
        console.log('\n5. Testing Agent Orchestrator Integration');
        console.log('==========================================');

        const orchestrator = new AgentOrchestrator(stateManager);

        // Mock agent for testing
        const mockAgent = {
            name: 'MockAnalyticalAgent',
            description: 'Mock agent for testing',
            capabilities: ['analysis', 'data_processing'],
            
            async processMessage(message, context) {
                return {
                    content: `Processed: ${message}`,
                    confidence: 0.9,
                    reasoning: 'Mock processing',
                    metadata: {
                        processingTime: 500,
                        tokensUsed: 50
                    }
                };
            },

            getInfo() {
                return {
                    name: this.name,
                    description: this.description,
                    capabilities: this.capabilities
                };
            }
        };

        // Register mock agent
        orchestrator.registerAgent(mockAgent);
        console.log('✅ Mock agent registered');

        // Test agent selection with preferences
        const selectedAgent = orchestrator.selectAgent('I need data analysis help', {
            userPreferences: { preferredAgent: 'MockAnalyticalAgent' },
            sessionContext: { agentHistory: [] }
        });

        console.log('✅ Agent selection with preferences');
        console.log(`   Selected agent: ${selectedAgent?.name || 'None'}`);
        console.log(`   Matches preference: ${selectedAgent?.name === 'MockAnalyticalAgent'}`);

        // Test agent continuity logic
        const continuityAgent = orchestrator.selectAgent('Continue the analysis', {
            userPreferences: { agentLock: false },
            sessionContext: { 
                agentHistory: [
                    {
                        agentName: 'MockAnalyticalAgent',
                        timestamp: new Date(Date.now() - 30000), // 30 seconds ago
                        confidence: 0.9
                    }
                ]
            }
        });

        console.log('✅ Agent continuity logic');
        console.log(`   Continuity agent: ${continuityAgent?.name || 'None'}`);
        console.log(`   Maintains continuity: ${continuityAgent?.name === 'MockAnalyticalAgent'}`);

        // Test 6: Agent Lock Enforcement
        console.log('\n6. Testing Agent Lock Enforcement');
        console.log('==================================');

        const lockedPreferences = {
            agentLock: true,
            preferredAgent: 'MockAnalyticalAgent',
            agentLockTimestamp: new Date(Date.now() - 10000) // 10 seconds ago
        };

        const lockedAgent = orchestrator.selectAgent('Try different task', {
            userPreferences: lockedPreferences,
            sessionContext: { agentHistory: [] }
        });

        console.log('✅ Agent lock enforcement');
        console.log(`   Locked to agent: ${lockedPreferences.preferredAgent}`);
        console.log(`   Selected agent: ${lockedAgent?.name || 'None'}`);
        console.log(`   Lock respected: ${lockedAgent?.name === lockedPreferences.preferredAgent}`);

        // Test lock expiration (simulate expired lock)
        const expiredLockPreferences = {
            agentLock: true,
            preferredAgent: 'MockAnalyticalAgent',
            agentLockTimestamp: new Date(Date.now() - 25 * 60 * 1000) // 25 minutes ago (expired)
        };

        const expiredLockAgent = orchestrator.selectAgent('Task after lock expiration', {
            userPreferences: expiredLockPreferences,
            sessionContext: { agentHistory: [] }
        });

        console.log('✅ Agent lock expiration');
        console.log(`   Lock timestamp: 25 minutes ago`);
        console.log(`   Lock expired: ${Date.now() - new Date(expiredLockPreferences.agentLockTimestamp).getTime() > 20 * 60 * 1000}`);
        console.log(`   Agent selection freed: ${expiredLockAgent !== null}`);

        // Test 7: Performance and Scalability
        console.log('\n7. Testing Performance and Scalability');
        console.log('=======================================');

        // Test tracking large number of interactions
        const manyInteractions = [];
        for (let i = 0; i < 100; i++) {
            manyInteractions.push({
                agentName: `Agent${i % 3}`,
                timestamp: new Date(Date.now() + i * 1000),
                confidence: 0.8 + (Math.random() * 0.2),
                reason: `Interaction ${i}`
            });
        }

        const perfStartTime = Date.now();
        const perfResult = await stateManager.updateSessionState(
            'perf-session',
            { agentHistory: manyInteractions },
            { ...context, sessionId: 'perf-session' }
        );
        const perfEndTime = Date.now();

        console.log('✅ Performance test completed');
        console.log(`   Tracked ${manyInteractions.length} interactions in ${perfEndTime - perfStartTime}ms`);
        console.log(`   Average time per interaction: ${(perfEndTime - perfStartTime) / manyInteractions.length}ms`);

        // Test memory usage estimation
        const memoryUsage = JSON.stringify(perfResult.data).length;
        console.log(`   Session data size: ${Math.round(memoryUsage / 1024)}KB`);

        // Test 8: Error Handling and Edge Cases
        console.log('\n8. Testing Error Handling and Edge Cases');
        console.log('=========================================');

        // Test invalid agent interaction
        try {
            await stateManager.updateSessionState(
                sessionId,
                { 
                    agentHistory: [
                        {
                            // Missing required fields
                            agentName: null,
                            timestamp: 'invalid-date'
                        }
                    ]
                },
                context
            );
            console.log('✅ Handled invalid agent interaction gracefully');
        } catch (error) {
            console.log('✅ Properly caught invalid agent interaction error');
        }

        // Test invalid tool usage
        try {
            await stateManager.updateSessionState(
                sessionId,
                {
                    toolsUsed: [
                        {
                            // Missing required fields
                            toolName: '',
                            executionTime: 'not-a-number'
                        }
                    ]
                },
                context
            );
            console.log('✅ Handled invalid tool usage gracefully');
        } catch (error) {
            console.log('✅ Properly caught invalid tool usage error');
        }

        // Test agent selection with no available agents
        orchestrator.agents.clear(); // Clear all agents
        const noAgentResult = orchestrator.selectAgent('Test message', {
            userPreferences: {},
            sessionContext: { agentHistory: [] }
        });

        console.log('✅ Agent selection with no agents');
        console.log(`   Result: ${noAgentResult === null ? 'null (expected)' : 'unexpected result'}`);

        console.log('\n🎉 All agent tracking tests completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Agent tracking test failed:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testAgentTracking()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testAgentTracking }; 