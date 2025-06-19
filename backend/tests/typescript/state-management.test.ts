/**
 * State Management TypeScript Test Suite
 * 
 * Comprehensive tests for the State Management system including:
 * - StateManager singleton pattern
 * - Session state management
 * - Persistence layer testing (Memory and File)
 * - State serialization and deserialization
 * - Cleanup and lifecycle management
 */

import { StateManager } from '../../src/state/StateManager';
import { MemoryPersistence } from '../../src/state/persistence/MemoryPersistence';
import { FilePersistence } from '../../src/state/persistence/FilePersistence';
import { SessionState, AgentState, PersistenceInterface } from '../../src/state/interfaces';
import * as fs from 'fs';
import * as path from 'path';

// Test utilities following existing patterns
function runTest(testName: string, testFunction: () => boolean | void): boolean {
    try {
        console.log(`🧪 Test: ${testName}`);
        const result = testFunction();
        if (result === true || result === undefined) {
            console.log('✅ PASSED\n');
            return true;
        } else {
            console.log('❌ FAILED\n');
            return false;
        }
    } catch (error) {
        console.log(`❌ FAILED: ${(error as Error).message}\n`);
        return false;
    }
}

async function runAsyncTest(testName: string, testFunction: () => Promise<boolean | void>): Promise<boolean> {
    try {
        console.log(`🧪 Test: ${testName}`);
        const result = await testFunction();
        if (result === true || result === undefined) {
            console.log('✅ PASSED\n');
            return true;
        } else {
            console.log('❌ FAILED\n');
            return false;
        }
    } catch (error) {
        console.log(`❌ FAILED: ${(error as Error).message}\n`);
        return false;
    }
}

// State Management Test Utilities
export class StateManagementTestUtils {
    static createTestSessionState(sessionId: string, overrides: Partial<SessionState> = {}): SessionState {
        return {
            sessionId,
            createdAt: new Date(),
            lastAccessed: new Date(),
            metadata: {
                userAgent: 'test-agent',
                ipAddress: '127.0.0.1',
                ...overrides.metadata
            },
            agents: new Map(),
            conversationHistory: [],
            ...overrides
        };
    }

    static createTestAgentState(agentName: string, overrides: Partial<AgentState> = {}): AgentState {
        return {
            agentName,
            isActive: false,
            lastUsed: new Date(),
            context: {},
            memory: {},
            configuration: {},
            ...overrides
        };
    }

    static async createTestStateManager(persistence?: PersistenceInterface): Promise<StateManager> {
        const stateManager = StateManager.getInstance();
        
        // Clear existing state
        await stateManager.clearAllSessions();
        
        // Set test persistence if provided
        if (persistence) {
            (stateManager as any).persistence = persistence;
        }
        
        return stateManager;
    }

    static createTestFilePath(filename: string): string {
        const testDir = path.join(__dirname, 'test-data');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        return path.join(testDir, filename);
    }

    static async cleanupTestFiles(pattern: string): Promise<void> {
        const testDir = path.join(__dirname, 'test-data');
        if (fs.existsSync(testDir)) {
            const files = fs.readdirSync(testDir);
            for (const file of files) {
                if (file.includes(pattern)) {
                    fs.unlinkSync(path.join(testDir, file));
                }
            }
        }
    }

    static verifySessionState(state: SessionState, expected: Partial<SessionState>): void {
        for (const [key, value] of Object.entries(expected)) {
            const actualValue = state[key as keyof SessionState];
            
            if (key === 'agents' && value instanceof Map) {
                if (!(actualValue instanceof Map)) {
                    throw new Error(`Expected ${key} to be a Map`);
                }
                if (actualValue.size !== value.size) {
                    throw new Error(`Expected ${key} to have ${value.size} entries, got ${actualValue.size}`);
                }
            } else if (key === 'conversationHistory' && Array.isArray(value)) {
                if (!Array.isArray(actualValue)) {
                    throw new Error(`Expected ${key} to be an array`);
                }
                if (actualValue.length !== value.length) {
                    throw new Error(`Expected ${key} to have ${value.length} items, got ${actualValue.length}`);
                }
            } else if (actualValue !== value) {
                throw new Error(`Expected ${key} to be ${value}, got ${actualValue}`);
            }
        }
    }

    static verifyAgentState(state: AgentState, expected: Partial<AgentState>): void {
        for (const [key, value] of Object.entries(expected)) {
            const actualValue = state[key as keyof AgentState];
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
                // Deep comparison for objects
                if (JSON.stringify(actualValue) !== JSON.stringify(value)) {
                    throw new Error(`Expected ${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(actualValue)}`);
                }
            } else if (actualValue !== value) {
                throw new Error(`Expected ${key} to be ${value}, got ${actualValue}`);
            }
        }
    }
}

async function testStateManagement(): Promise<void> {
    console.log('=== State Management TypeScript Test Suite ===\n');
    
    let testsPassed = 0;
    let testsTotal = 0;

    function incrementTest(passed: boolean): void {
        testsTotal++;
        if (passed) testsPassed++;
    }

    // Test 1: StateManager Singleton Pattern
    incrementTest(runTest('StateManager Singleton Pattern', () => {
        const manager1 = StateManager.getInstance();
        const manager2 = StateManager.getInstance();
        
        if (manager1 !== manager2) {
            throw new Error('StateManager should be a singleton');
        }
        
        console.log('   ✅ Singleton pattern working correctly');
        return true;
    }));

    // Test 2: Session Creation and Retrieval
    incrementTest(await runAsyncTest('Session Creation and Retrieval', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();
        
        const sessionId = 'test-session-001';
        const metadata = {
            userAgent: 'test-browser',
            ipAddress: '192.168.1.1',
            customData: 'test-value'
        };

        const session = await stateManager.createSession(sessionId, metadata);
        
        StateManagementTestUtils.verifySessionState(session, {
            sessionId,
            metadata
        });

        // Retrieve session
        const retrievedSession = await stateManager.getSession(sessionId);
        if (!retrievedSession) {
            throw new Error('Should be able to retrieve created session');
        }

        StateManagementTestUtils.verifySessionState(retrievedSession, {
            sessionId,
            metadata
        });

        console.log('   ✅ Session creation and retrieval working correctly');
        return true;
    }));

    // Test 3: Agent State Management
    incrementTest(await runAsyncTest('Agent State Management', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();
        
        const sessionId = 'test-session-002';
        await stateManager.createSession(sessionId);

        const agentName = 'TestAgent';
        const agentState = StateManagementTestUtils.createTestAgentState(agentName, {
            isActive: true,
            context: { mode: 'analytical', temperature: 0.7 },
            memory: { lastQuery: 'Hello world' },
            configuration: { maxTokens: 1000 }
        });

        await stateManager.setAgentState(sessionId, agentName, agentState);

        // Retrieve agent state
        const retrievedState = await stateManager.getAgentState(sessionId, agentName);
        if (!retrievedState) {
            throw new Error('Should be able to retrieve agent state');
        }

        StateManagementTestUtils.verifyAgentState(retrievedState, {
            agentName,
            isActive: true,
            context: { mode: 'analytical', temperature: 0.7 },
            memory: { lastQuery: 'Hello world' },
            configuration: { maxTokens: 1000 }
        });

        console.log('   ✅ Agent state management working correctly');
        return true;
    }));

    // Test 4: Conversation History Management
    incrementTest(await runAsyncTest('Conversation History Management', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();
        
        const sessionId = 'test-session-003';
        await stateManager.createSession(sessionId);

        const messages = [
            { role: 'user', content: 'Hello', timestamp: new Date() },
            { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
            { role: 'user', content: 'How are you?', timestamp: new Date() }
        ];

        // Add messages to conversation history
        for (const message of messages) {
            await stateManager.addToConversationHistory(sessionId, message);
        }

        const history = await stateManager.getConversationHistory(sessionId);
        if (history.length !== messages.length) {
            throw new Error(`Expected ${messages.length} messages in history, got ${history.length}`);
        }

        // Verify message content
        for (let i = 0; i < messages.length; i++) {
            if (history[i].role !== messages[i].role || history[i].content !== messages[i].content) {
                throw new Error(`Message ${i} does not match expected content`);
            }
        }

        console.log('   ✅ Conversation history management working correctly');
        console.log(`   📝 Stored ${history.length} messages`);
        return true;
    }));

    // Test 5: Memory Persistence Layer
    incrementTest(await runAsyncTest('Memory Persistence Layer', async () => {
        const memoryPersistence = new MemoryPersistence();
        const stateManager = await StateManagementTestUtils.createTestStateManager(memoryPersistence);

        const sessionId = 'memory-test-session';
        const testData = StateManagementTestUtils.createTestSessionState(sessionId, {
            metadata: { testType: 'memory-persistence' }
        });

        // Save and load session
        await memoryPersistence.saveSession(sessionId, testData);
        const loadedData = await memoryPersistence.loadSession(sessionId);

        if (!loadedData) {
            throw new Error('Should be able to load saved session from memory');
        }

        StateManagementTestUtils.verifySessionState(loadedData, {
            sessionId,
            metadata: { testType: 'memory-persistence' }
        });

        // Test session listing
        const sessions = await memoryPersistence.listSessions();
        if (!sessions.includes(sessionId)) {
            throw new Error('Session should be in the list of sessions');
        }

        console.log('   ✅ Memory persistence layer working correctly');
        return true;
    }));

    // Test 6: File Persistence Layer
    incrementTest(await runAsyncTest('File Persistence Layer', async () => {
        const testFilePath = StateManagementTestUtils.createTestFilePath('test-sessions.json');
        const filePersistence = new FilePersistence(testFilePath);
        
        const sessionId = 'file-test-session';
        const testData = StateManagementTestUtils.createTestSessionState(sessionId, {
            metadata: { testType: 'file-persistence' }
        });

        try {
            // Save and load session
            await filePersistence.saveSession(sessionId, testData);
            
            // Verify file was created
            if (!fs.existsSync(testFilePath)) {
                throw new Error('Persistence file should be created');
            }

            const loadedData = await filePersistence.loadSession(sessionId);
            if (!loadedData) {
                throw new Error('Should be able to load saved session from file');
            }

            StateManagementTestUtils.verifySessionState(loadedData, {
                sessionId,
                metadata: { testType: 'file-persistence' }
            });

            // Test session listing
            const sessions = await filePersistence.listSessions();
            if (!sessions.includes(sessionId)) {
                throw new Error('Session should be in the list of sessions');
            }

            console.log('   ✅ File persistence layer working correctly');
            console.log(`   💾 Data saved to: ${testFilePath}`);
            return true;
        } finally {
            // Cleanup
            await StateManagementTestUtils.cleanupTestFiles('test-sessions');
        }
    }));

    // Test 7: Session Cleanup and Expiration
    incrementTest(await runAsyncTest('Session Cleanup and Expiration', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();

        // Create multiple sessions
        const sessionIds = ['cleanup-1', 'cleanup-2', 'cleanup-3'];
        for (const sessionId of sessionIds) {
            await stateManager.createSession(sessionId);
        }

        // Verify all sessions exist
        let activeSessions = await stateManager.listActiveSessions();
        if (activeSessions.length !== sessionIds.length) {
            throw new Error(`Expected ${sessionIds.length} active sessions, got ${activeSessions.length}`);
        }

        // Clear specific session
        await stateManager.clearSession('cleanup-1');
        
        activeSessions = await stateManager.listActiveSessions();
        if (activeSessions.length !== sessionIds.length - 1) {
            throw new Error(`Expected ${sessionIds.length - 1} active sessions after clearing one`);
        }

        if (activeSessions.includes('cleanup-1')) {
            throw new Error('Cleared session should not be in active sessions list');
        }

        // Clear all sessions
        await stateManager.clearAllSessions();
        
        activeSessions = await stateManager.listActiveSessions();
        if (activeSessions.length !== 0) {
            throw new Error('Should have no active sessions after clearing all');
        }

        console.log('   ✅ Session cleanup and expiration working correctly');
        return true;
    }));

    // Test 8: State Serialization and Deserialization
    incrementTest(await runAsyncTest('State Serialization and Deserialization', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();
        
        const sessionId = 'serialization-test';
        const session = await stateManager.createSession(sessionId, {
            testData: 'serialization-test',
            complexObject: { nested: { value: 42 } }
        });

        // Add agent state with complex data
        const agentState = StateManagementTestUtils.createTestAgentState('SerializationAgent', {
            isActive: true,
            context: { 
                complexData: { 
                    array: [1, 2, 3], 
                    nested: { deep: { value: 'test' } } 
                } 
            },
            memory: { 
                conversation: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi!' }
                ]
            }
        });

        await stateManager.setAgentState(sessionId, 'SerializationAgent', agentState);

        // Get state info (this triggers serialization internally)
        const stateInfo = await stateManager.getStateInfo();
        if (stateInfo.totalSessions !== 1) {
            throw new Error('Should have 1 session in state info');
        }

        // Retrieve and verify the session and agent state
        const retrievedSession = await stateManager.getSession(sessionId);
        if (!retrievedSession) {
            throw new Error('Should be able to retrieve session after serialization');
        }

        const retrievedAgentState = await stateManager.getAgentState(sessionId, 'SerializationAgent');
        if (!retrievedAgentState) {
            throw new Error('Should be able to retrieve agent state after serialization');
        }

        StateManagementTestUtils.verifyAgentState(retrievedAgentState, {
            agentName: 'SerializationAgent',
            isActive: true
        });

        console.log('   ✅ State serialization and deserialization working correctly');
        return true;
    }));

    // Test 9: Concurrent Session Management
    incrementTest(await runAsyncTest('Concurrent Session Management', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();

        // Create multiple sessions concurrently
        const sessionPromises = [];
        for (let i = 0; i < 5; i++) {
            sessionPromises.push(stateManager.createSession(`concurrent-${i}`, { index: i }));
        }

        const sessions = await Promise.all(sessionPromises);
        
        if (sessions.length !== 5) {
            throw new Error('Should create 5 sessions concurrently');
        }

        // Verify all sessions are unique and properly created
        const sessionIds = sessions.map(s => s.sessionId);
        const uniqueIds = new Set(sessionIds);
        if (uniqueIds.size !== 5) {
            throw new Error('All session IDs should be unique');
        }

        // Test concurrent agent state updates
        const agentPromises = [];
        for (let i = 0; i < 5; i++) {
            const agentState = StateManagementTestUtils.createTestAgentState(`Agent${i}`, {
                isActive: i % 2 === 0,
                context: { sessionIndex: i }
            });
            agentPromises.push(stateManager.setAgentState(`concurrent-${i}`, `Agent${i}`, agentState));
        }

        await Promise.all(agentPromises);

        // Verify all agent states were set correctly
        for (let i = 0; i < 5; i++) {
            const agentState = await stateManager.getAgentState(`concurrent-${i}`, `Agent${i}`);
            if (!agentState) {
                throw new Error(`Should have agent state for Agent${i}`);
            }
            
            StateManagementTestUtils.verifyAgentState(agentState, {
                agentName: `Agent${i}`,
                isActive: i % 2 === 0,
                context: { sessionIndex: i }
            });
        }

        console.log('   ✅ Concurrent session management working correctly');
        console.log(`   🔄 Created and managed ${sessions.length} concurrent sessions`);
        return true;
    }));

    // Test 10: State Manager Statistics and Info
    incrementTest(await runAsyncTest('State Manager Statistics and Info', async () => {
        const stateManager = await StateManagementTestUtils.createTestStateManager();

        // Create test data
        await stateManager.createSession('stats-1', { type: 'test' });
        await stateManager.createSession('stats-2', { type: 'test' });
        
        const agentState1 = StateManagementTestUtils.createTestAgentState('Agent1', { isActive: true });
        const agentState2 = StateManagementTestUtils.createTestAgentState('Agent2', { isActive: false });
        
        await stateManager.setAgentState('stats-1', 'Agent1', agentState1);
        await stateManager.setAgentState('stats-2', 'Agent2', agentState2);

        // Get state info
        const stateInfo = await stateManager.getStateInfo();
        
        if (stateInfo.totalSessions !== 2) {
            throw new Error(`Expected 2 total sessions, got ${stateInfo.totalSessions}`);
        }

        if (stateInfo.totalAgents !== 2) {
            throw new Error(`Expected 2 total agents, got ${stateInfo.totalAgents}`);
        }

        if (stateInfo.activeAgents !== 1) {
            throw new Error(`Expected 1 active agent, got ${stateInfo.activeAgents}`);
        }

        // Verify session list
        const activeSessions = await stateManager.listActiveSessions();
        if (activeSessions.length !== 2) {
            throw new Error(`Expected 2 active sessions, got ${activeSessions.length}`);
        }

        console.log('   ✅ State manager statistics and info working correctly');
        console.log('   📊 State Info:', JSON.stringify(stateInfo, null, 2));
        return true;
    }));

    // Test Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 STATE MANAGEMENT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total: ${testsTotal} tests, ${testsPassed} passed, ${testsTotal - testsPassed} failed`);
    
    if (testsPassed === testsTotal) {
        console.log('🎉 All State Management tests passed!');
    } else {
        console.log('⚠️  Some State Management tests failed.');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testStateManagement().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

export { testStateManagement, StateManagementTestUtils }; 