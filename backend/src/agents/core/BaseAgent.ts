/**
 * Base Agent Interface
 * 
 * Standardized interface for all agents in the ChatSG system.
 * Provides common methods and capabilities while preserving existing agent functionality.
 */

import { AgentResponse, AgentCapabilities, ValidationResult, StreamingCallback } from '../../types';
import { getStorageManager } from '../../storage/StorageManager';
import { ContextManager, ContextMessage } from '../../storage/ContextManager';
import { getStateManager } from '../../state/StateManager';
import { STORAGE_CONFIG } from '../../config/storage.config';

/**
 * Base interface that all agents must implement
 */
export interface BaseAgent {
    /**
     * Process a user message and return a response
     * @param input - The user's input message
     * @param sessionId - Session identifier for conversation context
     * @param streamCallback - Optional callback for streaming responses
     * @returns Promise resolving to agent response
     */
    processMessage(input: string, sessionId: string, streamCallback?: StreamingCallback): Promise<AgentResponse>;

    /**
     * Get agent capabilities and metadata
     * @returns Agent capabilities object
     */
    getCapabilities(): AgentCapabilities;

    /**
     * Validate agent configuration
     * @returns Validation result with success status and any errors
     */
    validateConfig(): ValidationResult;

    /**
     * Get agent information (name, version, etc.)
     * @returns Agent metadata
     */
    getInfo(): {
        name: string;
        version: string;
        description: string;
        type: string;
    };

    /**
     * Initialize agent with configuration
     * @param config - Agent configuration object
     * @returns Promise resolving when initialization is complete
     */
    initialize?(config?: any): Promise<void>;

    /**
     * Cleanup resources when agent is destroyed
     * @returns Promise resolving when cleanup is complete
     */
    cleanup?(): Promise<void>;

    /**
     * Get session information for a specific session
     * @param sessionId - Session identifier
     * @returns Session information object
     */
    getSessionInfo?(sessionId: string): any;

    /**
     * Clear session data for a specific session
     * @param sessionId - Session identifier
     * @returns Promise resolving when session is cleared
     */
    clearSession?(sessionId: string): Promise<void>;
}

/**
 * Abstract base class providing common functionality
 * Agents can extend this class for shared behavior
 */
export abstract class AbstractBaseAgent implements BaseAgent {
    protected name: string;
    protected version: string;
    protected description: string;
    protected type: string;

    constructor(name: string, version: string = '1.0.0', description: string = '', type: string = 'generic') {
        this.name = name;
        this.version = version;
        this.description = description;
        this.type = type;
    }

    abstract processMessage(input: string, sessionId: string): Promise<AgentResponse>;
    abstract getCapabilities(): AgentCapabilities;
    abstract validateConfig(): ValidationResult;

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            type: this.type
        };
    }

    async initialize(config?: any): Promise<void> {
        // Default implementation - can be overridden
        console.log(`[${this.name}] Initialized`);
    }

    async cleanup(): Promise<void> {
        // Default implementation - can be overridden
        console.log(`[${this.name}] Cleaned up`);
    }

    /**
     * Build context messages with conversation history
     * Helper method for agents to get properly formatted context
     */
    protected async buildContextMessages(
        sessionId: string, 
        currentInput: string,
        systemPrompt: string
    ): Promise<ContextMessage[]> {
        const storageManager = getStorageManager();
        const stateManager = getStateManager();
        
        // Check if Mem0 is enabled
        if (STORAGE_CONFIG.mem0.enabled) {
            console.log(`[${this.name}] Using Mem0 for context retrieval`);
            
            try {
                // Check if cross-session memory is enabled
                let enhancedSystemPrompt = systemPrompt;
                const sessionState = await stateManager.getSessionState(sessionId, {
                    sessionId,
                    agentName: this.name,
                    timestamp: new Date()
                });
                
                if (sessionState.success && sessionState.data?.userPreferences?.crossSessionMemory) {
                    // For now, add a note about cross-session memory
                    // In the future, Mem0 will handle this automatically
                    enhancedSystemPrompt = `[Cross-session memory is enabled]\n\n${systemPrompt}`;
                }
                
                // Use Mem0's intelligent context retrieval with timeout
                const startTime = Date.now();
                console.log(`[${this.name}] Starting Mem0 context retrieval...`);
                
                const contextPromise = storageManager.getContextForQuery(
                    currentInput,
                    sessionId,
                    enhancedSystemPrompt
                );
                
                // Create a timeout promise that resolves with minimal context
                const timeoutPromise = new Promise<any[]>((resolve) => 
                    setTimeout(() => {
                        const timeoutElapsed = Date.now() - startTime;
                        console.log(`[${this.name}] Mem0 context retrieval timed out after ${timeoutElapsed}ms (2s limit), using minimal context`);
                        resolve([
                            { role: 'system', content: enhancedSystemPrompt }
                        ]);
                    }, 2000) // 2 second timeout for faster streaming start
                );
                
                // Race between actual context and timeout
                const contextMessages = await Promise.race([contextPromise, timeoutPromise]);
                const elapsed = Date.now() - startTime;
                console.log(`[${this.name}] Context retrieval completed in ${elapsed}ms`);
                
                // Add the current user input
                contextMessages.push({
                    role: 'user',
                    content: currentInput
                });
                
                console.log(`[${this.name}] Mem0 returned ${contextMessages.length} context messages`);
                return contextMessages as ContextMessage[];
                
            } catch (error) {
                console.error(`[${this.name}] Failed to use Mem0, falling back to traditional context:`, error);
                // Fall through to traditional method
            }
        }
        
        // Traditional context building (when Mem0 is disabled or fails)
        const contextMessages = await storageManager.getContextMessages(sessionId);
        
        console.log(`[${this.name}] Retrieved ${contextMessages.length} messages from conversation history`);
        
        // Check if cross-session memory is enabled
        let enhancedSystemPrompt = systemPrompt;
        try {
            const sessionState = await stateManager.getSessionState(sessionId, {
                sessionId,
                agentName: this.name,
                timestamp: new Date()
            });
            
            console.log(`[${this.name}] Session state:`, sessionState.data?.userPreferences);
            
            if (sessionState.success && sessionState.data?.userPreferences?.crossSessionMemory) {
                console.log(`[${this.name}] Cross-session memory is enabled for session ${sessionId}`);
                
                // Get user ID from session metadata
                const sessions = storageManager.listSessions();
                const sessionInfo = sessions.find(s => s.sessionId === sessionId);
                const userId = sessionInfo?.metadata?.userId;
                
                if (userId) {
                    // Get cross-session context
                    const crossSessionData = await storageManager.getCrossSessionContext(
                        sessionId,
                        userId
                    );
                    
                    if (crossSessionData.sessions.length > 0) {
                        const config = STORAGE_CONFIG.crossSession.contextInjectionFormat;
                        
                        // Build cross-session context string
                        let crossSessionContext = `\n\n${config.header}\n\n`;
                        
                        for (const session of crossSessionData.sessions) {
                            const sessionHeader = config.sessionFormat
                                .replace('{title}', session.title)
                                .replace('{lastActive}', new Date(session.lastActive).toLocaleString());
                            
                            crossSessionContext += `${sessionHeader}\n`;
                            
                            // Add messages from this session
                            let sessionSnippet = '';
                            for (const msg of session.messages.slice(-5)) { // Last 5 messages
                                const role = msg.type === 'user' ? 'User' : 'Assistant';
                                const preview = msg.content.substring(0, 200);
                                sessionSnippet += `${role}: ${preview}${msg.content.length > 200 ? '...' : ''}\n`;
                            }
                            
                            // Truncate if too long
                            if (sessionSnippet.length > config.maxSnippetLength) {
                                sessionSnippet = sessionSnippet.substring(0, config.maxSnippetLength) + '...';
                            }
                            
                            crossSessionContext += sessionSnippet;
                            crossSessionContext += config.sessionSeparator;
                        }
                        
                        // Inject cross-session context at the beginning of system prompt
                        enhancedSystemPrompt = crossSessionContext + '\n\n' + systemPrompt;
                        
                        console.log(`[${this.name}] Injected context from ${crossSessionData.sessions.length} cross-sessions (${crossSessionData.totalMessages} messages)`);
                        
                        // Debug: Log a preview of the cross-session context
                        const contextPreview = crossSessionContext.substring(0, 500);
                        console.log(`[${this.name}] Cross-session context preview: ${contextPreview}...`);
                    }
                }
            }
        } catch (error) {
            console.warn(`[${this.name}] Failed to get cross-session context:`, error);
        }
        
        const contextResult = ContextManager.buildContext(
            contextMessages,
            currentInput,
            {
                systemPrompt: enhancedSystemPrompt,
                maxMessages: 50,
                overflowStrategy: 'sliding-window'
            }
        );
        
        console.log(`[${this.name}] Context built with ${contextResult.messages.length} messages (truncated: ${contextResult.truncated})`);
        
        // Debug output disabled - uncomment to enable
        /*
        // Save context to file for debugging
        try {
            const fs = require('fs');
            const path = require('path');
            const debugPath = path.join('/Users/crossgenai/sg/chatSG', 'llm-context-debug.json');
            const debugData = {
                sessionId,
                timestamp: new Date().toISOString(),
                agent: this.name,
                messages: contextResult.messages,
                messageCount: contextResult.messages.length,
                systemPromptPreview: enhancedSystemPrompt.substring(0, 1000) + '...',
                fullSystemPrompt: enhancedSystemPrompt
            };
            fs.writeFileSync(debugPath, JSON.stringify(debugData, null, 2));
            console.log(`[${this.name}] Saved LLM context to ${debugPath}`);
        } catch (error) {
            console.warn(`[${this.name}] Failed to save debug context:`, error);
        }
        */
        
        return contextResult.messages;
    }
}

/**
 * Agent metadata interface for registry
 */
export interface AgentMetadata {
    name: string;
    version: string;
    description: string;
    type: string;
    capabilities: AgentCapabilities;
    configPath?: string;
    modulePath?: string;
    isLegacy?: boolean;
}

/**
 * Agent factory interface
 */
export interface AgentFactory {
    /**
     * Create an agent instance
     * @param name - Agent name
     * @param config - Agent configuration
     * @returns Promise resolving to agent instance
     */
    createAgent(name: string, config?: any): Promise<BaseAgent>;

    /**
     * Get available agent types
     * @returns Array of available agent names
     */
    getAvailableAgents(): string[];

    /**
     * Check if an agent type is available
     * @param name - Agent name
     * @returns True if agent is available
     */
    isAgentAvailable(name: string): boolean;
} 