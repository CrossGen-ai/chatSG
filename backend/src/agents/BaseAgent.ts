/**
 * Base Agent Interface
 * 
 * Standardized interface for all agents in the ChatSG system.
 * Provides common methods and capabilities while preserving existing agent functionality.
 */

import { AgentResponse, AgentCapabilities, ValidationResult } from '../types';

/**
 * Base interface that all agents must implement
 */
export interface BaseAgent {
    /**
     * Process a user message and return a response
     * @param input - The user's input message
     * @param sessionId - Session identifier for conversation context
     * @returns Promise resolving to agent response
     */
    processMessage(input: string, sessionId: string): Promise<AgentResponse>;

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