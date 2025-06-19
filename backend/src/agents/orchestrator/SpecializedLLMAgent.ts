/**
 * Specialized LLM Agent Base Class
 * 
 * This base class provides common LLM functionality for specialized orchestrator agents.
 * It integrates with the existing llm-helper.js system for consistent provider switching
 * and follows the same patterns established by AgentZero.
 */

import { AbstractBaseAgent } from '../BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult } from '../../types';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

// Import LLM helper using require since it's a JavaScript module
const { getLLMHelper } = require('../../../utils/llm-helper');

/**
 * Base class for specialized LLM-powered agents in the orchestrator system
 */
export abstract class SpecializedLLMAgent extends AbstractBaseAgent {
    protected llmHelper: any;
    protected llm: any;
    protected specialization: string;
    protected sessions: Map<string, any> = new Map();

    constructor(agentType: string, specialization: string, description?: string) {
        super(
            agentType, 
            '1.0.0', 
            description || `Specialized ${specialization} agent for orchestrator system`, 
            'orchestrator'
        );
        
        this.specialization = specialization;
        
        try {
            // Initialize LLM using the same helper utility as AgentZero
            this.llmHelper = getLLMHelper();
            
            // Validate configuration
            const validation = this.llmHelper.validateConfiguration();
            if (!validation.valid) {
                console.error(`[${this.name}] LLM configuration validation failed:`, validation.errors);
                throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
            }
            
            // Create LLM instance
            this.llm = this.llmHelper.createChatLLM();
            
            // Log configuration info
            const configInfo = this.llmHelper.getConfigInfo();
            console.log(`[${this.name}] Initialized with ${configInfo.provider} provider, model: ${configInfo.model}`);
            
        } catch (error: any) {
            console.error(`[${this.name}] Failed to initialize LLM:`, error);
            throw error;
        }
    }

    /**
     * Process a user message using the LLM
     * Follows the same pattern as AgentZero for consistency
     */
    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        try {
            console.log(`[${this.name}] Processing message for session: ${sessionId}`);
            
            // Get specialized system prompt
            const context = {
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                userInput: input,
                mode: this.specialization,
                agentType: this.name
            };
            
            const systemPrompt = this.getSpecializedPrompt(context);
            
            // Create messages following LangChain pattern
            const systemMessage = new SystemMessage(systemPrompt);
            const humanMessage = new HumanMessage(input);
            
            // Get session history for context (keep last 5 messages)
            const sessionHistory = this.getSessionHistory(sessionId);
            const recentHistory = sessionHistory.slice(-5);
            
            // Prepare messages for LLM
            const messages = [systemMessage, ...recentHistory, humanMessage];
            
            // Get LLM response
            const response = await this.llm.invoke(messages);
            
            // Save to session history
            this.addToSessionHistory(sessionId, humanMessage, response);
            
            // Get configuration info for response metadata
            const configInfo = this.llmHelper.getConfigInfo();
            
            console.log(`[${this.name}] Generated response for session: ${sessionId}`);
            
            return {
                success: true,
                message: response.content,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                llmProvider: configInfo.provider,
                model: configInfo.model,
                metadata: {
                    agent: this.name,
                    specialization: this.specialization,
                    temperature: configInfo.temperature,
                    maxTokens: configInfo.maxTokens
                }
            };
            
        } catch (error: any) {
            console.error(`[${this.name}] Error processing message:`, error);
            
            return {
                success: false,
                message: `I apologize, but I encountered an error processing your request: ${error.message}. Please try again.`,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                metadata: {
                    agent: this.name,
                    error: error.message
                }
            };
        }
    }

    /**
     * Get specialized prompt for this agent type
     * Must be implemented by concrete agent classes
     */
    protected abstract getSpecializedPrompt(context: any): string;

    /**
     * Get session history for context
     */
    protected getSessionHistory(sessionId: string): any[] {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, []);
        }
        return this.sessions.get(sessionId);
    }

    /**
     * Add messages to session history
     */
    protected addToSessionHistory(sessionId: string, humanMessage: any, aiMessage: any): void {
        const history = this.getSessionHistory(sessionId);
        history.push(humanMessage, aiMessage);
        
        // Keep history manageable (max 20 messages)
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
    }

    /**
     * Get session information
     */
    getSessionInfo(sessionId: string): any {
        const history = this.getSessionHistory(sessionId);
        return {
            sessionId: sessionId,
            messageCount: history.length,
            exists: this.sessions.has(sessionId),
            agent: this.name,
            specialization: this.specialization
        };
    }

    /**
     * Clear session data
     */
    async clearSession(sessionId: string): Promise<void> {
        if (this.sessions.has(sessionId)) {
            this.sessions.delete(sessionId);
            console.log(`[${this.name}] Cleared session: ${sessionId}`);
        }
    }

    /**
     * Validate agent configuration
     */
    validateConfig(): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Check LLM helper configuration
            const llmValidation = this.llmHelper.validateConfiguration();
            if (!llmValidation.valid) {
                errors.push(...llmValidation.errors);
            }

            // Check required properties
            if (!this.name) errors.push('Agent name is required');
            if (!this.specialization) errors.push('Specialization is required');
            if (!this.llm) errors.push('LLM instance is required');

            // Add warnings for missing optional features
            if (!this.description || this.description.trim() === '') {
                warnings.push('Agent description is empty');
            }

        } catch (error: any) {
            errors.push(`Configuration validation failed: ${error.message}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): AgentCapabilities {
        return {
            name: this.name,
            version: this.version,
            supportedModes: [this.specialization],
            features: [
                'llm_interaction',
                'session_memory',
                'context_awareness',
                'provider_switching'
            ],
            inputTypes: ['text'],
            outputTypes: ['text'],
            maxSessionMemory: 20,
            supportsTools: false, // Can be overridden by concrete implementations
            supportsStateSharing: true
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        console.log(`[${this.name}] Cleaning up resources...`);
        this.sessions.clear();
        await super.cleanup();
    }

    /**
     * Get LLM information (useful for debugging)
     */
    getLLMInfo(): any {
        return this.llmHelper ? this.llmHelper.getConfigInfo() : null;
    }
} 