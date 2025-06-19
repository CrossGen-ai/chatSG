/**
 * State Management System Test
 * 
 * Comprehensive test for the centralized state management system including
 * session isolation, cross-agent data sharing, and AgentZero integration.
 */

const { InMemoryChatMessageHistory } = require('@langchain/core/chat_history');

async function testStateManagement() {
    console.log('🔄 Testing State Management System...\n');

    try {
        // Import the compiled modules
        const { getStateManager, createStateContext } = require('./dist/src/state');
        const { initializeStateManagementForAgentZero } = require('./dist/src/state/AgentZeroIntegration');

        // Test 1: Basic State Manager Initialization
        console.log('1. Testing State Manager Initialization');
        console.log('======================================');
        
        const stateManager = getStateManager({
            defaultTTL: 60000, // 1 minute for testing
            maxSessions: 100,
            maxSharedStates: 1000,
            enablePersistence: true,
            enableEvents: true
        });
        
        console.log('✅ State manager initialized');

        // Test 2: Session State Management
        console.log('\n2. Testing Session State Management');
        console.log('====================================');
        
        const sessionId = 'test-session-001';
        const context = createStateContext(sessionId, 'TestAgent', 'user123');
        
        // Get session state (should create new one)
        const sessionResult = await stateManager.getSessionState(sessionId, context);
        console.log('Session state result:', {
            success: sessionResult.success,
            sessionId: sessionResult.data?.sessionId,
            dataKeys: Object.keys(sessionResult.data?.data || {})
        });

        // Update session state
        const updateResult = await stateManager.updateSessionState(
            sessionId,
            { data: { userPreferences: { theme: 'dark', language: 'en' }, lastActivity: new Date() } },
            context
        );
        console.log('Session update result:', {
            success: updateResult.success,
            dataKeys: Object.keys(updateResult.data?.data || {}),
            updatedAt: updateResult.data?.metadata.updatedAt
        });

        // Test 3: Shared State Management
        console.log('\n3. Testing Shared State Management');
        console.log('===================================');

        // Create global shared state
        const globalStateResult = await stateManager.setSharedState(
            'global-config',
            { apiVersion: '1.0', features: ['chat', 'tools', 'state'] },
            { 
                scope: 'global',
                permissions: { read: ['*'], write: ['TestAgent'], delete: ['TestAgent'] }
            },
            context
        );
        console.log('Global state creation:', {
            success: globalStateResult.success,
            key: globalStateResult.data?.key,
            scope: globalStateResult.data?.scope
        });

        // Create user-scoped shared state
        const userStateResult = await stateManager.setSharedState(
            'user-settings',
            { notifications: true, autoSave: true },
            {
                scope: 'user',
                permissions: { read: ['user123'], write: ['user123'], delete: ['user123'] }
            },
            context
        );
        console.log('User state creation:', {
            success: userStateResult.success,
            key: userStateResult.data?.key,
            scope: userStateResult.data?.scope
        });

        // Test reading shared states
        const globalReadResult = await stateManager.getSharedState('global-config', context);
        console.log('Global state read:', {
            success: globalReadResult.success,
            data: globalReadResult.data?.data
        });

        // Test 4: Cross-Agent Data Sharing
        console.log('\n4. Testing Cross-Agent Data Sharing');
        console.log('====================================');

        // Agent 1 creates shared data
        const agent1Context = createStateContext(sessionId, 'Agent1', 'user123');
        const sharedDataResult = await stateManager.setSharedState(
            'agent-collaboration',
            { task: 'process-document', status: 'in-progress', assignedTo: 'Agent2' },
            {
                scope: 'global',
                permissions: { read: ['Agent1', 'Agent2'], write: ['Agent1', 'Agent2'], delete: ['Agent1'] }
            },
            agent1Context
        );
        console.log('Agent1 shared data:', {
            success: sharedDataResult.success,
            permissions: sharedDataResult.data?.permissions
        });

        // Agent 2 reads and updates shared data
        const agent2Context = createStateContext(sessionId, 'Agent2', 'user123');
        const readSharedResult = await stateManager.getSharedState('agent-collaboration', agent2Context);
        console.log('Agent2 read shared data:', {
            success: readSharedResult.success,
            data: readSharedResult.data?.data
        });

        // Agent 2 updates the shared data
        const updateSharedResult = await stateManager.setSharedState(
            'agent-collaboration',
            { task: 'process-document', status: 'completed', completedBy: 'Agent2' },
            {
                scope: 'global',
                permissions: { read: ['Agent1', 'Agent2'], write: ['Agent1', 'Agent2'], delete: ['Agent1'] }
            },
            agent2Context
        );
        console.log('Agent2 updated shared data:', {
            success: updateSharedResult.success,
            version: updateSharedResult.data?.metadata.version
        });

        // Test 5: Query Operations
        console.log('\n5. Testing Query Operations');
        console.log('============================');

        const queryResult = await stateManager.queryStates({
            scope: 'global',
            limit: 10
        }, context);
        console.log('Query results:', {
            success: queryResult.success,
            count: queryResult.data?.length || 0,
            keys: queryResult.data?.map(state => state.key) || []
        });

        // Test 6: AgentZero Integration
        console.log('\n6. Testing AgentZero Integration');
        console.log('=================================');

        // Simulate AgentZero structure
        const mockAgentZero = {
            sessions: new Map(),
            getSessionMemory(sessionId) {
                if (!this.sessions.has(sessionId)) {
                    this.sessions.set(sessionId, new InMemoryChatMessageHistory());
                }
                return this.sessions.get(sessionId);
            },
            async processMessage(userInput, sessionId) {
                return {
                    content: `Mock response to: ${userInput}`,
                    timestamp: new Date()
                };
            }
        };

        // Initialize state management for AgentZero
        const stateAwareAgentZero = initializeStateManagementForAgentZero(mockAgentZero);
        console.log('✅ State-aware AgentZero created');

        // Test enhanced session
        const enhancedSession = stateAwareAgentZero.getOrCreateEnhancedSession('integration-test');
        
        // Set session data
        const sessionDataSet = await enhancedSession.setSessionData('testKey', 'testValue');
        console.log('Enhanced session data set:', sessionDataSet);

        // Get session data
        const sessionDataGet = await enhancedSession.getSessionData('testKey');
        console.log('Enhanced session data get:', sessionDataGet);

        // Share data with another agent
        const shareResult = await enhancedSession.shareWithAgent('Agent3', 'shared-info', {
            message: 'Hello from enhanced session',
            timestamp: new Date()
        });
        console.log('Data shared with Agent3:', shareResult);

        // Test 7: Permission System
        console.log('\n7. Testing Permission System');
        console.log('=============================');

        // Create restricted state
        const restrictedStateResult = await stateManager.setSharedState(
            'restricted-data',
            { secret: 'classified-information' },
            {
                scope: 'global',
                permissions: { read: ['AdminAgent'], write: ['AdminAgent'], delete: ['AdminAgent'] }
            },
            context
        );
        console.log('Restricted state created:', restrictedStateResult.success);

        // Try to access with different agent
        const unauthorizedContext = createStateContext(sessionId, 'UnauthorizedAgent', 'user123');
        const unauthorizedReadResult = await stateManager.getSharedState('restricted-data', unauthorizedContext);
        console.log('Unauthorized access attempt:', {
            success: unauthorizedReadResult.success,
            error: unauthorizedReadResult.error
        });

        // Test 8: State Statistics
        console.log('\n8. Testing State Statistics');
        console.log('============================');

        const statsResult = await stateManager.getStats();
        console.log('State statistics:', {
            success: statsResult.success,
            totalSessions: statsResult.data?.totalSessions,
            totalSharedStates: statsResult.data?.totalSharedStates,
            memoryUsage: statsResult.data?.memoryUsage,
            performance: statsResult.data?.performance
        });

        // Test 9: Event System
        console.log('\n9. Testing Event System');
        console.log('========================');

        let eventCount = 0;
        stateManager.addEventListener('*', (event) => {
            eventCount++;
            console.log(`Event received: ${event.type} for ${event.key}`);
        });

        // Trigger some events
        await stateManager.setSharedState('event-test', { value: 'test' }, { scope: 'global' }, context);
        await stateManager.getSharedState('event-test', context);
        await stateManager.deleteSharedState('event-test', context);

        console.log(`Total events captured: ${eventCount}`);

        // Test 10: Cleanup and Expiration
        console.log('\n10. Testing Cleanup and Expiration');
        console.log('===================================');

        // Create state with short TTL
        const shortTTLResult = await stateManager.setSharedState(
            'short-lived',
            { expires: 'soon' },
            {
                scope: 'global',
                metadata: { ttl: 1000 } // 1 second
            },
            context
        );
        console.log('Short-lived state created:', shortTTLResult.success);

        // Wait for expiration
        console.log('Waiting for expiration...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Try to access expired state
        const expiredReadResult = await stateManager.getSharedState('short-lived', context);
        console.log('Expired state access:', {
            success: expiredReadResult.success,
            error: expiredReadResult.error
        });

        // Run cleanup
        const cleanupResult = await stateManager.clearExpiredStates();
        console.log('Cleanup result:', {
            success: cleanupResult.success,
            cleaned: cleanupResult.data
        });

        console.log('\n✅ State Management System Test Completed Successfully!');
        console.log('=========================================================');
        
        return {
            success: true,
            sessionStates: 1,
            sharedStates: queryResult.data?.length || 0,
            eventsTriggered: eventCount,
            integrationWorking: true
        };

    } catch (error) {
        console.error('\n❌ State Management Test Failed:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
if (require.main === module) {
    testStateManagement()
        .then(result => {
            console.log('\nFinal Result:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testStateManagement }; 