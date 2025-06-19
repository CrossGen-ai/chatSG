"use strict";
/**
 * AgentZero Wrapper
 *
 * Wrapper class that makes the existing AgentZero JavaScript implementation
 * compatible with the BaseAgent interface while preserving all functionality.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentZeroWrapper = void 0;
/**
 * Wrapper for legacy AgentZero to implement BaseAgent interface
 */
class AgentZeroWrapper {
    constructor() {
        // Import the legacy AgentZero class
        const AgentZeroClass = require('../../../agent/AgentZero/agent');
        this.agentZero = new AgentZeroClass();
        console.log('[AgentZeroWrapper] Initialized wrapper for AgentZero');
    }
    /**
     * Process a user message using the legacy AgentZero
     */
    async processMessage(input, sessionId) {
        try {
            // Call the legacy processMessage method
            const result = await this.agentZero.processMessage(input, sessionId);
            // Transform legacy response to new format
            return {
                success: true,
                message: result.response || result.content || result,
                sessionId: sessionId,
                timestamp: result.timestamp || new Date().toISOString(),
                llmProvider: result.provider,
                model: result.model,
                metadata: {
                    promptVariant: result.promptVariant,
                    reasoning: result.reasoning,
                    confidence: result.confidence,
                    classificationMethod: result.classificationMethod,
                    mode: result.mode
                }
            };
        }
        catch (error) {
            console.error('[AgentZeroWrapper] Error processing message:', error);
            return {
                success: false,
                message: `I apologize, but I encountered an error: ${error.message}`,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                metadata: {
                    error: error.message
                }
            };
        }
    }
    /**
     * Get AgentZero capabilities
     */
    getCapabilities() {
        return {
            name: 'AgentZero',
            version: '1.0.0',
            supportedModes: ['conversational', 'analytical', 'creative'],
            features: [
                'text-processing',
                'context-memory',
                'prompt-classification',
                'intelligent-routing',
                'session-management',
                'langgraph-integration'
            ],
            inputTypes: ['text'],
            outputTypes: ['text'],
            maxSessionMemory: 128000,
            supportsTools: false,
            supportsStateSharing: true
        };
    }
    /**
     * Validate AgentZero configuration
     */
    validateConfig() {
        try {
            // Use the existing validation method if available
            if (this.agentZero.llmHelper && this.agentZero.llmHelper.validateConfiguration) {
                const validation = this.agentZero.llmHelper.validateConfiguration();
                return {
                    valid: validation.valid,
                    errors: validation.errors || [],
                    warnings: validation.warnings || []
                };
            }
            // Fallback validation
            return {
                valid: true,
                errors: [],
                warnings: []
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Configuration validation failed: ${error.message}`],
                warnings: []
            };
        }
    }
    /**
     * Get agent information
     */
    getInfo() {
        return {
            name: 'AgentZero',
            version: '1.0.0',
            description: 'LangGraph-based conversational agent with intelligent prompt classification',
            type: 'conversational'
        };
    }
    /**
     * Initialize the agent (optional)
     */
    async initialize(config) {
        // AgentZero initializes in constructor, so this is a no-op
        console.log('[AgentZeroWrapper] Agent already initialized');
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            // Clear all sessions if method exists
            if (this.agentZero.sessions) {
                this.agentZero.sessions.clear();
            }
            console.log('[AgentZeroWrapper] Cleanup completed');
        }
        catch (error) {
            console.warn('[AgentZeroWrapper] Error during cleanup:', error);
        }
    }
    /**
     * Get session information
     */
    getSessionInfo(sessionId) {
        try {
            if (this.agentZero.getSessionInfo) {
                return this.agentZero.getSessionInfo(sessionId);
            }
            // Fallback - check if session exists
            if (this.agentZero.sessions && this.agentZero.sessions.has(sessionId)) {
                return {
                    sessionId: sessionId,
                    exists: true,
                    messageCount: 0 // We can't easily get this from InMemoryChatMessageHistory
                };
            }
            return {
                sessionId: sessionId,
                exists: false,
                messageCount: 0
            };
        }
        catch (error) {
            console.warn('[AgentZeroWrapper] Error getting session info:', error);
            return {
                sessionId: sessionId,
                exists: false,
                error: error.message
            };
        }
    }
    /**
     * Clear session data
     */
    async clearSession(sessionId) {
        try {
            if (this.agentZero.clearSession) {
                await this.agentZero.clearSession(sessionId);
            }
            else if (this.agentZero.sessions) {
                this.agentZero.sessions.delete(sessionId);
            }
            console.log(`[AgentZeroWrapper] Cleared session: ${sessionId}`);
        }
        catch (error) {
            console.warn(`[AgentZeroWrapper] Error clearing session ${sessionId}:`, error);
        }
    }
    /**
     * Get the underlying AgentZero instance (for advanced usage)
     */
    getUnderlyingAgent() {
        return this.agentZero;
    }
    /**
     * Get LLM information from the underlying agent
     */
    getLLMInfo() {
        try {
            if (this.agentZero.getLLMInfo) {
                return this.agentZero.getLLMInfo();
            }
            return null;
        }
        catch (error) {
            console.warn('[AgentZeroWrapper] Error getting LLM info:', error);
            return null;
        }
    }
    /**
     * Get classification information from the underlying agent
     */
    getClassificationInfo() {
        try {
            if (this.agentZero.getClassificationInfo) {
                return this.agentZero.getClassificationInfo();
            }
            return null;
        }
        catch (error) {
            console.warn('[AgentZeroWrapper] Error getting classification info:', error);
            return null;
        }
    }
}
exports.AgentZeroWrapper = AgentZeroWrapper;
//# sourceMappingURL=AgentZeroWrapper.js.map