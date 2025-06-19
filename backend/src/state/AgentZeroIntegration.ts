/**
 * AgentZero State Integration
 * 
 * Seamless integration with existing AgentZero session management.
 * Provides backward compatibility while enabling state management features.
 */

import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { StateManager, getStateManager } from './StateManager';
import { createStateContext } from './utils';
import { StateContext, SessionState } from './interfaces';

/**
 * Enhanced session wrapper that integrates with state management
 */
export class EnhancedAgentZeroSession {
    private stateManager: StateManager;
    private originalSession: InMemoryChatMessageHistory;
    private sessionId: string;
    private agentName: string;

    constructor(
        sessionId: string,
        originalSession: InMemoryChatMessageHistory,
        agentName: string = 'AgentZero',
        stateManager?: StateManager
    ) {
        this.sessionId = sessionId;
        this.originalSession = originalSession;
        this.agentName = agentName;
        this.stateManager = stateManager || getStateManager();

        // Wrap the existing session in state management
        this.initializeStateManagement();
    }

    private async initializeStateManagement(): Promise<void> {
        try {
            await this.stateManager.wrapExistingSession(this.sessionId, this.originalSession);
            console.log(`[EnhancedAgentZeroSession] Initialized state management for session: ${this.sessionId}`);
        } catch (error) {
            console.warn(`[EnhancedAgentZeroSession] Failed to initialize state management:`, error);
        }
    }

    /**
     * Get the original session for backward compatibility
     */
    getOriginalSession(): InMemoryChatMessageHistory {
        return this.originalSession;
    }

    /**
     * Get session state data
     */
    async getSessionData(key?: string): Promise<any> {
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
    async setSessionData(key: string, value: any): Promise<boolean> {
        const context = this.createContext();
        const result = await this.stateManager.updateSessionState(
            this.sessionId,
            { data: { [key]: value } },
            context
        );
        
        return result.success;
    }

    /**
     * Get shared state accessible to this session
     */
    async getSharedState(key: string): Promise<any> {
        const context = this.createContext();
        const result = await this.stateManager.getSharedState(key, context);
        
        return result.success ? result.data?.data : null;
    }

    /**
     * Set shared state (if permissions allow)
     */
    async setSharedState(
        key: string, 
        data: any, 
        scope: 'global' | 'user' | 'session' | 'agent' = 'global',
        permissions?: { read: string[]; write: string[]; delete: string[] }
    ): Promise<boolean> {
        const context = this.createContext();
        const result = await this.stateManager.setSharedState(
            key,
            data,
            { scope, permissions },
            context
        );
        
        return result.success;
    }

    /**
     * Share data with other agents
     */
    async shareWithAgent(agentName: string, key: string, data: any): Promise<boolean> {
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
    async shareInSession(key: string, data: any): Promise<boolean> {
        return this.setSharedState(`session:${this.sessionId}:${key}`, data, 'session');
    }

    /**
     * Get conversation context with state data
     */
    async getConversationContext(): Promise<{
        messages: any[];
        sessionData: any;
        sharedData: Record<string, any>;
    }> {
        const messages = await this.originalSession.getMessages();
        const sessionData = await this.getSessionData();
        
        // Get relevant shared states
        const context = this.createContext();
        const sharedStatesResult = await this.stateManager.queryStates({
            sessionId: this.sessionId,
            limit: 10
        }, context);

        const sharedData: Record<string, any> = {};
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
    async storeConversationMetadata(metadata: Record<string, any>): Promise<boolean> {
        return this.setSessionData('conversationMetadata', metadata);
    }

    /**
     * Get conversation metadata
     */
    async getConversationMetadata(): Promise<Record<string, any> | null> {
        return this.getSessionData('conversationMetadata');
    }

    /**
     * Create state context for operations
     */
    private createContext(): StateContext {
        return createStateContext(this.sessionId, this.agentName);
    }

    /**
     * Get session statistics
     */
    async getSessionStats(): Promise<{
        messageCount: number;
        sessionDataSize: number;
        sharedStatesCount: number;
        lastActivity: Date;
    }> {
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

/**
 * State-aware AgentZero wrapper
 */
export class StateAwareAgentZero {
    public originalAgentZero: any;  // Made public for proxy access
    private stateManager: StateManager;
    private enhancedSessions: Map<string, EnhancedAgentZeroSession> = new Map();

    constructor(originalAgentZero: any, stateManager?: StateManager) {
        this.originalAgentZero = originalAgentZero;
        this.stateManager = stateManager || getStateManager();

        // Wrap existing sessions
        this.wrapExistingSessions();
    }

    private wrapExistingSessions(): void {
        if (this.originalAgentZero.sessions) {
            for (const [sessionId, session] of this.originalAgentZero.sessions.entries()) {
                this.enhancedSessions.set(
                    sessionId,
                    new EnhancedAgentZeroSession(sessionId, session, 'AgentZero', this.stateManager)
                );
            }
        }
    }

    /**
     * Get enhanced session with state management capabilities
     */
    getEnhancedSession(sessionId: string): EnhancedAgentZeroSession | null {
        return this.enhancedSessions.get(sessionId) || null;
    }

    /**
     * Create or get enhanced session
     */
    getOrCreateEnhancedSession(sessionId: string): EnhancedAgentZeroSession {
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
    async processMessageWithState(userInput: string, sessionId: string = 'default'): Promise<{
        response: any;
        sessionContext: any;
    }> {
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
    getAllEnhancedSessions(): Map<string, EnhancedAgentZeroSession> {
        return new Map(this.enhancedSessions);
    }

    /**
     * Get state manager instance
     */
    getStateManager(): StateManager {
        return this.stateManager;
    }

    /**
     * Proxy all other methods to original AgentZero
     */
    [key: string]: any;
}

// Create proxy to forward all other method calls
export function createStateAwareAgentZero(originalAgentZero: any, stateManager?: StateManager): any {
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
                return function(...args: any[]) {
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
export function initializeStateManagementForAgentZero(
    agentZero: any,
    config?: any
): any {
    const stateManager = getStateManager(config);
    return createStateAwareAgentZero(agentZero, stateManager);
} 