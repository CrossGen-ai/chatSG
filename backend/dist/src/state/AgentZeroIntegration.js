"use strict";
/**
 * AgentZero State Integration
 *
 * Seamless integration with existing AgentZero session management.
 * Provides backward compatibility while enabling state management features.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateAwareAgentZero = exports.EnhancedAgentZeroSession = void 0;
exports.createStateAwareAgentZero = createStateAwareAgentZero;
exports.initializeStateManagementForAgentZero = initializeStateManagementForAgentZero;
const StateManager_1 = require("./StateManager");
const utils_1 = require("./utils");
/**
 * Enhanced session wrapper that integrates with state management
 */
class EnhancedAgentZeroSession {
    constructor(sessionId, originalSession, agentName = 'AgentZero', stateManager) {
        this.sessionId = sessionId;
        this.originalSession = originalSession;
        this.agentName = agentName;
        this.stateManager = stateManager || (0, StateManager_1.getStateManager)();
        // Wrap the existing session in state management
        this.initializeStateManagement();
    }
    async initializeStateManagement() {
        try {
            await this.stateManager.wrapExistingSession(this.sessionId, this.originalSession);
            console.log(`[EnhancedAgentZeroSession] Initialized state management for session: ${this.sessionId}`);
        }
        catch (error) {
            console.warn(`[EnhancedAgentZeroSession] Failed to initialize state management:`, error);
        }
    }
    /**
     * Get the original session for backward compatibility
     */
    getOriginalSession() {
        return this.originalSession;
    }
    /**
     * Get session state data
     */
    async getSessionData(key) {
        const context = this.createContext();
        const result = await this.stateManager.getSessionState(this.sessionId, context);
        if (!result.success || !result.data) {
            return null;
        }
        return key ? result.data.data[key] : result.data.data;
    }
    /**
     * Set session state data
     */
    async setSessionData(key, value) {
        const context = this.createContext();
        const result = await this.stateManager.updateSessionState(this.sessionId, { data: { [key]: value } }, context);
        return result.success;
    }
    /**
     * Get shared state accessible to this session
     */
    async getSharedState(key) {
        const context = this.createContext();
        const result = await this.stateManager.getSharedState(key, context);
        return result.success ? result.data?.data : null;
    }
    /**
     * Set shared state (if permissions allow)
     */
    async setSharedState(key, data, scope = 'global', permissions) {
        const context = this.createContext();
        const result = await this.stateManager.setSharedState(key, data, { scope, permissions }, context);
        return result.success;
    }
    /**
     * Share data with other agents
     */
    async shareWithAgent(agentName, key, data) {
        const permissions = {
            read: [agentName, this.agentName],
            write: [agentName, this.agentName],
            delete: [this.agentName]
        };
        return this.setSharedState(`agent-share:${key}`, data, 'global', permissions);
    }
    /**
     * Share data within session scope
     */
    async shareInSession(key, data) {
        return this.setSharedState(`session:${this.sessionId}:${key}`, data, 'session');
    }
    /**
     * Get conversation context with state data
     */
    async getConversationContext() {
        const messages = await this.originalSession.getMessages();
        const sessionData = await this.getSessionData();
        // Get relevant shared states
        const context = this.createContext();
        const sharedStatesResult = await this.stateManager.queryStates({
            sessionId: this.sessionId,
            limit: 10
        }, context);
        const sharedData = {};
        if (sharedStatesResult.success && sharedStatesResult.data) {
            for (const sharedState of sharedStatesResult.data) {
                sharedData[sharedState.key] = sharedState.data;
            }
        }
        return {
            messages,
            sessionData,
            sharedData
        };
    }
    /**
     * Store conversation metadata
     */
    async storeConversationMetadata(metadata) {
        return this.setSessionData('conversationMetadata', metadata);
    }
    /**
     * Get conversation metadata
     */
    async getConversationMetadata() {
        return this.getSessionData('conversationMetadata');
    }
    /**
     * Create state context for operations
     */
    createContext() {
        return (0, utils_1.createStateContext)(this.sessionId, this.agentName);
    }
    /**
     * Get session statistics
     */
    async getSessionStats() {
        const messages = await this.originalSession.getMessages();
        const context = this.createContext();
        const sessionResult = await this.stateManager.getSessionState(this.sessionId, context);
        const sharedStatesResult = await this.stateManager.queryStates({
            sessionId: this.sessionId
        }, context);
        return {
            messageCount: messages.length,
            sessionDataSize: sessionResult.success ?
                Object.keys(sessionResult.data?.data || {}).length : 0,
            sharedStatesCount: sharedStatesResult.success ?
                sharedStatesResult.data?.length || 0 : 0,
            lastActivity: sessionResult.success ?
                sessionResult.data?.metadata.lastAccess || new Date() : new Date()
        };
    }
}
exports.EnhancedAgentZeroSession = EnhancedAgentZeroSession;
/**
 * State-aware AgentZero wrapper
 */
class StateAwareAgentZero {
    constructor(originalAgentZero, stateManager) {
        this.enhancedSessions = new Map();
        this.originalAgentZero = originalAgentZero;
        this.stateManager = stateManager || (0, StateManager_1.getStateManager)();
        // Wrap existing sessions
        this.wrapExistingSessions();
    }
    wrapExistingSessions() {
        if (this.originalAgentZero.sessions) {
            for (const [sessionId, session] of this.originalAgentZero.sessions.entries()) {
                this.enhancedSessions.set(sessionId, new EnhancedAgentZeroSession(sessionId, session, 'AgentZero', this.stateManager));
            }
        }
    }
    /**
     * Get enhanced session with state management capabilities
     */
    getEnhancedSession(sessionId) {
        return this.enhancedSessions.get(sessionId) || null;
    }
    /**
     * Create or get enhanced session
     */
    getOrCreateEnhancedSession(sessionId) {
        let enhanced = this.enhancedSessions.get(sessionId);
        if (!enhanced) {
            // Get or create original session
            const originalSession = this.originalAgentZero.getSessionMemory(sessionId);
            enhanced = new EnhancedAgentZeroSession(sessionId, originalSession, 'AgentZero', this.stateManager);
            this.enhancedSessions.set(sessionId, enhanced);
        }
        return enhanced;
    }
    /**
     * Process message with state context
     */
    async processMessageWithState(userInput, sessionId = 'default') {
        // Get enhanced session
        const enhancedSession = this.getOrCreateEnhancedSession(sessionId);
        // Get conversation context
        const conversationContext = await enhancedSession.getConversationContext();
        // Process with original AgentZero
        const response = await this.originalAgentZero.processMessage(userInput, sessionId);
        // Store any relevant metadata
        await enhancedSession.storeConversationMetadata({
            lastResponse: response.content,
            timestamp: new Date().toISOString(),
            userInput
        });
        return {
            response,
            sessionContext: conversationContext
        };
    }
    /**
     * Get all enhanced sessions
     */
    getAllEnhancedSessions() {
        return new Map(this.enhancedSessions);
    }
    /**
     * Get state manager instance
     */
    getStateManager() {
        return this.stateManager;
    }
}
exports.StateAwareAgentZero = StateAwareAgentZero;
// Create proxy to forward all other method calls
function createStateAwareAgentZero(originalAgentZero, stateManager) {
    const wrapper = new StateAwareAgentZero(originalAgentZero, stateManager);
    return new Proxy(wrapper, {
        get(target, prop, receiver) {
            // If the property exists on the wrapper, use it
            if (prop in target) {
                return Reflect.get(target, prop, receiver);
            }
            // Otherwise, proxy to the original AgentZero
            const originalValue = Reflect.get(target.originalAgentZero, prop);
            if (typeof originalValue === 'function') {
                return function (...args) {
                    return originalValue.apply(target.originalAgentZero, args);
                };
            }
            return originalValue;
        }
    });
}
/**
 * Initialize state management for existing AgentZero instance
 */
function initializeStateManagementForAgentZero(agentZero, config) {
    const stateManager = (0, StateManager_1.getStateManager)(config);
    return createStateAwareAgentZero(agentZero, stateManager);
}
//# sourceMappingURL=AgentZeroIntegration.js.map