/**
 * AgentRouter Wrapper
 * 
 * Wrapper class that makes the existing AgentRouter JavaScript implementation
 * compatible with the BaseAgent interface while preserving all functionality.
 */

import { BaseAgent } from '../BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult } from '../../types';

/**
 * Wrapper for legacy AgentRouter to implement BaseAgent interface
 */
export class AgentRouterWrapper implements BaseAgent {
    private agentRouter: any;
    
    constructor() {
        // Import the legacy AgentRouter class
        const AgentRouterClass = require('../../../agent/AgentRouter/agent');
        this.agentRouter = new AgentRouterClass();
        console.log('[AgentRouterWrapper] Initialized wrapper for AgentRouter');
    }

    /**
     * Process a user message using the legacy AgentRouter
     * Note: AgentRouter is primarily for classification, not direct message processing
     */
    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        try {
            // AgentRouter doesn't process messages directly, it classifies them
            // We'll use it to classify the input and return classification info
            const result = await this.agentRouter.classifyPrompt(input, 'AgentZero', { sessionId });
            
            return {
                success: true,
                message: `Classification result: Selected variant "${result.selectedVariant}" with ${result.confidence}% confidence. Reasoning: ${result.reasoning}`,
                sessionId: sessionId,
                timestamp: result.timestamp || new Date().toISOString(),
                metadata: {
                    selectedVariant: result.selectedVariant,
                    fullVariantPath: result.fullVariantPath,
                    reasoning: result.reasoning,
                    confidence: result.confidence,
                    analysisMode: result.analysisMode,
                    targetAgent: result.targetAgent,
                    availableVariants: result.availableVariants,
                    fallbackUsed: result.fallbackUsed
                }
            };
        } catch (error) {
            console.error('[AgentRouterWrapper] Error processing message:', error);
            return {
                success: false,
                message: `Classification failed: ${(error as Error).message}`,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                metadata: {
                    error: (error as Error).message
                }
            };
        }
    }

    /**
     * Get AgentRouter capabilities
     */
    getCapabilities(): AgentCapabilities {
        return {
            name: 'AgentRouter',
            version: '1.0.0',
            supportedModes: ['classification', 'routing', 'analysis'],
            features: [
                'prompt-classification',
                'intelligent-routing',
                'variant-selection',
                'confidence-scoring',
                'fallback-handling',
                'cache-management'
            ],
            inputTypes: ['text'],
            outputTypes: ['classification'],
            maxSessionMemory: 0, // AgentRouter doesn't maintain session memory
            supportsTools: false,
            supportsStateSharing: false
        };
    }

    /**
     * Validate AgentRouter configuration
     */
    validateConfig(): ValidationResult {
        try {
            // Use the existing validation method if available
            if (this.agentRouter.llmHelper && this.agentRouter.llmHelper.validateConfiguration) {
                const validation = this.agentRouter.llmHelper.validateConfiguration();
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
        } catch (error) {
            return {
                valid: false,
                errors: [`Configuration validation failed: ${(error as Error).message}`],
                warnings: []
            };
        }
    }

    /**
     * Get agent information
     */
    getInfo() {
        return {
            name: 'AgentRouter',
            version: '1.0.0',
            description: 'Intelligent prompt classification and routing system',
            type: 'classifier'
        };
    }

    /**
     * Initialize the agent (optional)
     */
    async initialize(config?: any): Promise<void> {
        // AgentRouter initializes in constructor, so this is a no-op
        console.log('[AgentRouterWrapper] Agent already initialized');
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        try {
            // Clear cache if method exists
            if (this.agentRouter.clearCache) {
                this.agentRouter.clearCache();
            }
            console.log('[AgentRouterWrapper] Cleanup completed');
        } catch (error) {
            console.warn('[AgentRouterWrapper] Error during cleanup:', error);
        }
    }

    /**
     * Get session information (AgentRouter doesn't maintain sessions)
     */
    getSessionInfo(sessionId: string): any {
        return {
            sessionId: sessionId,
            exists: false,
            messageCount: 0,
            note: 'AgentRouter does not maintain session state'
        };
    }

    /**
     * Clear session data (no-op for AgentRouter)
     */
    async clearSession(sessionId: string): Promise<void> {
        console.log(`[AgentRouterWrapper] No session data to clear for: ${sessionId}`);
    }

    /**
     * Get the underlying AgentRouter instance (for advanced usage)
     */
    getUnderlyingAgent(): any {
        return this.agentRouter;
    }

    /**
     * Classify a prompt using the underlying AgentRouter
     */
    async classifyPrompt(userInput: string, targetAgent: string, context?: any): Promise<any> {
        return this.agentRouter.classifyPrompt(userInput, targetAgent, context);
    }

    /**
     * Get available variants for a target agent
     */
    getAvailableVariants(targetAgent: string): string[] {
        return this.agentRouter.getAvailableVariants(targetAgent);
    }

    /**
     * Clear classification cache
     */
    clearCache(targetAgent?: string): void {
        this.agentRouter.clearCache(targetAgent);
    }

    /**
     * Get cache information
     */
    getCacheInfo(): any {
        if (this.agentRouter.agentConfigCache) {
            return {
                size: this.agentRouter.agentConfigCache.size,
                keys: Array.from(this.agentRouter.agentConfigCache.keys())
            };
        }
        return { size: 0, keys: [] };
    }

    /**
     * Get router information
     */
    getRouterInfo(): any {
        try {
            if (this.agentRouter.getInfo) {
                return this.agentRouter.getInfo();
            }
            return null;
        } catch (error) {
            console.warn('[AgentRouterWrapper] Error getting router info:', error);
            return null;
        }
    }
} 