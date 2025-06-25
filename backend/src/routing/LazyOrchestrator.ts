/**
 * Lazy Agent Orchestrator
 * 
 * Enhanced orchestrator that uses LazyAgentManager for efficient agent creation
 * and caching. Provides the same interface as AgentOrchestrator but with
 * optimized resource usage and better performance for individual agents.
 */

import { LazyAgentManager, AgentSelectionResult } from '../agents/individual/LazyAgentManager';
import { AgentOrchestrator } from './AgentOrchestrator';
import {
    OrchestrationContext,
    AgentSelection,
    Task,
    TaskResult,
    BaseAgent,
    AgentCapabilities,
    AgentResponse
} from '../types';

/**
 * Configuration for lazy orchestration
 */
interface LazyOrchestrationConfig {
    maxCachedAgents: number;
    agentIdleTimeMinutes: number;
    enableHybridMode: boolean; // Use both lazy and pre-registered agents
    fallbackToTraditional: boolean;
}

/**
 * Performance statistics for lazy orchestration
 */
interface LazyOrchestrationStats {
    totalRequests: number;
    lazyAgentRequests: number;
    traditionalAgentRequests: number;
    cacheHitRate: number;
    averageResponseTime: number;
    agentCreationTime: number;
    agentRetrievalTime: number;
}

/**
 * Lazy Agent Orchestrator with intelligent caching
 */
export class LazyOrchestrator extends AgentOrchestrator {
    private lazyManager: LazyAgentManager;
    private lazyConfig: LazyOrchestrationConfig;
    private lazyStats: LazyOrchestrationStats;
    private responseTimes: number[] = [];

    constructor(config?: Partial<LazyOrchestrationConfig>) {
        // Initialize parent orchestrator
        super();

        this.lazyConfig = {
            maxCachedAgents: 3,
            agentIdleTimeMinutes: 30,
            enableHybridMode: true,
            fallbackToTraditional: true,
            ...config
        };

        // Initialize lazy agent manager
        this.lazyManager = new LazyAgentManager(
            this.lazyConfig.maxCachedAgents,
            this.lazyConfig.agentIdleTimeMinutes
        );

        // Initialize stats
        this.lazyStats = {
            totalRequests: 0,
            lazyAgentRequests: 0,
            traditionalAgentRequests: 0,
            cacheHitRate: 0,
            averageResponseTime: 0,
            agentCreationTime: 0,
            agentRetrievalTime: 0
        };

        console.log('[LazyOrchestrator] Initialized with config:', {
            maxCachedAgents: this.lazyConfig.maxCachedAgents,
            agentIdleTimeMinutes: this.lazyConfig.agentIdleTimeMinutes,
            enableHybridMode: this.lazyConfig.enableHybridMode
        });
    }

    /**
     * Enhanced agent selection using lazy loading
     */
    async selectAgent(input: string, context: OrchestrationContext): Promise<AgentSelection> {
        const startTime = Date.now();
        this.lazyStats.totalRequests++;

        try {
            // First, try lazy agent selection for individual agents
            const lazySelection = this.lazyManager.selectAgentType(input);
            
            // Check if we should use lazy agent or fall back to traditional
            if (this.shouldUseLazyAgent(lazySelection, context)) {
                this.lazyStats.lazyAgentRequests++;
                
                return {
                    selectedAgent: lazySelection.agentType,
                    confidence: this.normalizeConfidence(lazySelection.confidence),
                    reason: `Lazy selection: ${lazySelection.reasons.join(', ')}`,
                    fallbackAgents: this.lazyManager.getAvailableAgentTypes()
                        .filter(type => type !== lazySelection.agentType)
                };
            }

            // Fall back to traditional orchestration for complex scenarios
            if (this.lazyConfig.fallbackToTraditional) {
                this.lazyStats.traditionalAgentRequests++;
                return await super.selectAgent(input, context);
            }

            // Default to lazy agent with low confidence
            return {
                selectedAgent: lazySelection.agentType,
                confidence: 0.3,
                reason: 'Default lazy selection',
                fallbackAgents: this.lazyManager.getAvailableAgentTypes()
            };

        } catch (error) {
            console.error('[LazyOrchestrator] Selection failed:', error);
            
            // Ultimate fallback
            return {
                selectedAgent: 'analytical',
                confidence: 0.1,
                reason: `Error fallback: ${(error as Error).message}`,
                fallbackAgents: ['creative', 'technical']
            };
        } finally {
            const responseTime = Date.now() - startTime;
            this.updateResponseTime(responseTime);
        }
    }

    /**
     * Enhanced task delegation with lazy agent creation
     */
    async delegateTask(task: Task, targetAgent?: string): Promise<TaskResult> {
        const startTime = Date.now();

        try {
            // If no target agent specified, select one
            if (!targetAgent) {
                const context: OrchestrationContext = {
                    sessionId: task.parameters.sessionId || 'default',
                    userInput: task.input,
                    currentAgent: '',
                    availableAgents: this.lazyManager.getAvailableAgentTypes()
                };
                
                const selection = await this.selectAgent(task.input, context);
                targetAgent = selection.selectedAgent;
            }

            // Check if this is a lazy agent type
            if (this.isLazyAgentType(targetAgent)) {
                return await this.delegateToLazyAgent(task, targetAgent);
            }

            // Fall back to traditional delegation
            return await super.delegateTask(task, targetAgent);

        } catch (error) {
            console.error(`[LazyOrchestrator] Task delegation failed:`, error);
            
            return {
                taskId: task.id,
                success: false,
                result: undefined,
                error: (error as Error).message,
                executionTime: Date.now() - startTime,
                executedBy: targetAgent || 'unknown'
            };
        }
    }

    /**
     * Process a request using lazy agent management
     */
    async processRequest(input: string, sessionId: string): Promise<AgentResponse> {
        const startTime = Date.now();

        try {
            // Use lazy manager to process the request
            const response = await this.lazyManager.processRequest(input, sessionId);
            
            const responseTime = Date.now() - startTime;
            this.updateResponseTime(responseTime);
            
            return response;

        } catch (error) {
            console.error('[LazyOrchestrator] Request processing failed:', error);
            
            // Return error response
            return {
                success: false,
                message: `I apologize, but I encountered an error processing your request: ${(error as Error).message}`,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: {
                    agent: 'error-handler',
                    error: true
                }
            };
        }
    }

    /**
     * Get comprehensive statistics including lazy agent performance
     */
    getEnhancedStats() {
        const baseStats = super.getStats();
        const cacheStats = this.lazyManager.getStats();
        
        return {
            ...baseStats,
            lazy: {
                ...this.lazyStats,
                cacheHitRate: cacheStats.hitRate,
                cache: cacheStats
            }
        };
    }

    /**
     * Cleanup resources including lazy agent manager
     */
    async cleanup(): Promise<void> {
        console.log('[LazyOrchestrator] Starting cleanup...');
        
        // Cleanup lazy manager first
        await this.lazyManager.cleanup();
        
        // Then cleanup parent orchestrator
        await super.cleanup();
        
        console.log('[LazyOrchestrator] Cleanup completed');
    }

    // Private methods

    private shouldUseLazyAgent(selection: AgentSelectionResult, context: OrchestrationContext): boolean {
        // Use lazy agent if:
        // 1. Confidence is reasonable (> 0.5)
        // 2. It's a simple individual task
        // 3. No complex context requirements
        
        if (selection.confidence >= 1.0) return true;
        if (selection.confidence >= 0.5 && this.isSimpleTask(context.userInput)) return true;
        if (selection.agentType !== 'analytical' && selection.confidence > 0) return true;
        
        return false;
    }

    private isSimpleTask(input: string): boolean {
        const complexityIndicators = [
            'multiple', 'several', 'both', 'compare', 'combine',
            'workflow', 'process', 'step by step', 'sequential',
            'coordinate', 'collaborate', 'handoff'
        ];
        
        const lowerInput = input.toLowerCase();
        return !complexityIndicators.some(indicator => lowerInput.includes(indicator));
    }

    private isLazyAgentType(agentName: string): boolean {
        return this.lazyManager.getAvailableAgentTypes().includes(agentName);
    }

    private async delegateToLazyAgent(task: Task, agentType: string): Promise<TaskResult> {
        const startTime = Date.now();

        try {
            // Use lazy manager to get the agent
            const agent = await this.lazyManager.getAgent(agentType);
            
            if (!agent) {
                throw new Error(`Failed to create lazy agent: ${agentType}`);
            }

            // Process the task
            const response = await agent.processMessage(
                task.input,
                task.parameters.sessionId || 'default'
            );

            return {
                taskId: task.id,
                success: true,
                result: response,
                error: undefined,
                executionTime: Date.now() - startTime,
                executedBy: agentType
            };

        } catch (error) {
            return {
                taskId: task.id,
                success: false,
                result: undefined,
                error: (error as Error).message,
                executionTime: Date.now() - startTime,
                executedBy: agentType
            };
        }
    }

    private normalizeConfidence(rawConfidence: number): number {
        // Convert raw keyword score to 0-1 confidence
        if (rawConfidence >= 3) return 0.9;
        if (rawConfidence >= 2) return 0.8;
        if (rawConfidence >= 1.5) return 0.7;
        if (rawConfidence >= 1) return 0.6;
        if (rawConfidence >= 0.5) return 0.4;
        return 0.2;
    }

    private updateResponseTime(responseTime: number): void {
        this.responseTimes.push(responseTime);
        
        // Keep only last 100 response times
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift();
        }
        
        // Update average
        this.lazyStats.averageResponseTime = 
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }
}

/**
 * Factory function to create a lazy orchestrator
 */
export function createLazyOrchestrator(config?: Partial<LazyOrchestrationConfig>): LazyOrchestrator {
    return new LazyOrchestrator(config);
}

/**
 * Development configuration for lazy orchestrator
 */
export function createDevelopmentLazyOrchestrator(): LazyOrchestrator {
    return new LazyOrchestrator({
        maxCachedAgents: 2,
        agentIdleTimeMinutes: 5,
        enableHybridMode: true,
        fallbackToTraditional: true
    });
}

/**
 * Production configuration for lazy orchestrator
 */
export function createProductionLazyOrchestrator(): LazyOrchestrator {
    return new LazyOrchestrator({
        maxCachedAgents: 5,
        agentIdleTimeMinutes: 60,
        enableHybridMode: true,
        fallbackToTraditional: true
    });
}
