/**
 * Multi-Agent Orchestrator
 * 
 * Intelligent orchestrator for agent routing and delegation that works alongside
 * existing backend routing system. Implements agent selection algorithms and
 * conversation handoff mechanisms while preserving all existing API endpoints.
 */

import {
    AgentOrchestrator as IAgentOrchestrator,
    OrchestrationContext,
    AgentSelection,
    Task,
    TaskResult,
    HandoffContext,
    HandoffResult,
    BaseAgent,
    AgentCapabilities,
    ValidationResult,
    AgentResponse
} from '../types';
import { getStateManager } from '../state';
import { createStateContext } from '../state/utils';

/**
 * Agent scoring criteria for selection
 */
interface AgentScore {
    agent: string;
    score: number;
    reasons: string[];
    capabilities: AgentCapabilities;
}

/**
 * Orchestration strategy interface
 */
interface OrchestrationStrategy {
    name: string;
    selectAgent(context: OrchestrationContext, availableAgents: Map<string, BaseAgent>): Promise<AgentSelection>;
    shouldHandoff(currentAgent: string, context: OrchestrationContext, availableAgents: Map<string, BaseAgent>): Promise<boolean>;
}

/**
 * Task delegation configuration
 */
interface DelegationConfig {
    maxRetries: number;
    timeoutMs: number;
    fallbackStrategy: 'sequential' | 'parallel' | 'best-effort';
    enableStateSharing: boolean;
    enableConversationHistory: boolean;
}

/**
 * Main Agent Orchestrator implementation
 */
export class AgentOrchestrator implements IAgentOrchestrator {
    private agents: Map<string, BaseAgent> = new Map();
    private strategies: Map<string, OrchestrationStrategy> = new Map();
    private delegationConfig: DelegationConfig;
    private stateManager = getStateManager();
    
    // Performance tracking
    private orchestrationStats = {
        totalRequests: 0,
        successfulDelegations: 0,
        failedDelegations: 0,
        handoffs: 0,
        averageSelectionTime: 0,
        agentUsageCount: new Map<string, number>()
    };

    constructor(config?: Partial<DelegationConfig>) {
        this.delegationConfig = {
            maxRetries: 3,
            timeoutMs: 30000,
            fallbackStrategy: 'sequential',
            enableStateSharing: true,
            enableConversationHistory: true,
            ...config
        };

        // Initialize built-in strategies
        this.initializeStrategies();

        console.log('[AgentOrchestrator] Initialized with config:', {
            maxRetries: this.delegationConfig.maxRetries,
            timeoutMs: this.delegationConfig.timeoutMs,
            fallbackStrategy: this.delegationConfig.fallbackStrategy,
            enableStateSharing: this.delegationConfig.enableStateSharing
        });
    }

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent: BaseAgent): void {
        const info = agent.getInfo();
        this.agents.set(info.name, agent);
        this.orchestrationStats.agentUsageCount.set(info.name, 0);
        
        console.log(`[AgentOrchestrator] Registered agent: ${info.name} (${info.type})`);
    }

    /**
     * Unregister an agent
     */
    unregisterAgent(agentName: string): boolean {
        const removed = this.agents.delete(agentName);
        if (removed) {
            this.orchestrationStats.agentUsageCount.delete(agentName);
            console.log(`[AgentOrchestrator] Unregistered agent: ${agentName}`);
        }
        return removed;
    }

    /**
     * Get registered agent
     */
    getAgent(agentName: string): BaseAgent | null {
        return this.agents.get(agentName) || null;
    }

    /**
     * List all registered agents
     */
    listAgents(): AgentCapabilities[] {
        return Array.from(this.agents.values()).map(agent => agent.getCapabilities());
    }

    /**
     * Select the best agent for a given input and context
     */
    async selectAgent(input: string, context: OrchestrationContext): Promise<AgentSelection> {
        const startTime = Date.now();
        this.orchestrationStats.totalRequests++;

        try {
            console.log(`[AgentOrchestrator] Selecting agent for session: ${context.sessionId}`);
            console.log(`[AgentOrchestrator] User preferences:`, context.userPreferences);
            
            // Check for agent lock preference
            const agentLockEnabled = context.userPreferences?.agentLock === true;
            const preferredAgent = context.userPreferences?.preferredAgent;
            const lastAgentUsed = context.userPreferences?.lastAgentUsed;
            const agentLockTimestamp = context.userPreferences?.agentLockTimestamp;
            
            // Log agent lock status
            if (agentLockEnabled) {
                console.log(`[AgentOrchestrator] Agent lock enabled. Preferred: ${preferredAgent}, Last used: ${lastAgentUsed}`);
            }

            // If agent lock is enabled and we have a previous agent, prefer it
            if (agentLockEnabled && (preferredAgent || lastAgentUsed)) {
                const lockedAgent = preferredAgent || lastAgentUsed;
                
                // Verify the locked agent is still available
                if (lockedAgent && this.agents.has(lockedAgent)) {
                    console.log(`[AgentOrchestrator] Using locked agent: ${lockedAgent}`);
                    
                    // Track performance
                    const selectionTime = Date.now() - startTime;
                    this.updateAverageSelectionTime(selectionTime);
                    
                    // Update usage statistics
                    const currentCount = this.orchestrationStats.agentUsageCount.get(lockedAgent) || 0;
                    this.orchestrationStats.agentUsageCount.set(lockedAgent, currentCount + 1);

                    // Update session state with agent history
                    await this.updateAgentHistory(context.sessionId, {
                        agentName: lockedAgent,
                        timestamp: new Date(),
                        confidence: 0.95, // High confidence for locked agent
                        reason: `Agent lock enabled - using ${lockedAgent}`,
                        handoffFrom: context.currentAgent
                    });

                    return {
                        selectedAgent: lockedAgent,
                        confidence: 0.95,
                        reason: `Agent lock enabled - using preferred agent: ${lockedAgent}`,
                        fallbackAgents: Array.from(this.agents.keys()).filter(name => name !== lockedAgent)
                    };
                } else {
                    console.warn(`[AgentOrchestrator] Locked agent '${lockedAgent}' not available, falling back to normal selection`);
                }
            }

            // Use the capability-based strategy by default
            const strategy = this.strategies.get('capability-based') || this.strategies.get('simple');
            if (!strategy) {
                throw new Error('No orchestration strategy available');
            }

            const selection = await strategy.selectAgent(context, this.agents);
            
            // Apply agent continuity boost if we have a previous agent
            if (lastAgentUsed && this.agents.has(lastAgentUsed) && !agentLockEnabled) {
                // Give a small confidence boost to the last used agent for continuity
                if (selection.selectedAgent === lastAgentUsed) {
                    selection.confidence = Math.min(1.0, selection.confidence + 0.1);
                    selection.reason += ` (continuity bonus applied)`;
                    console.log(`[AgentOrchestrator] Applied continuity bonus to ${lastAgentUsed}`);
                }
            }
            
            // Track performance
            const selectionTime = Date.now() - startTime;
            this.updateAverageSelectionTime(selectionTime);
            
            // Update usage statistics
            const currentCount = this.orchestrationStats.agentUsageCount.get(selection.selectedAgent) || 0;
            this.orchestrationStats.agentUsageCount.set(selection.selectedAgent, currentCount + 1);

            // Update session state with agent history
            await this.updateAgentHistory(context.sessionId, {
                agentName: selection.selectedAgent,
                timestamp: new Date(),
                confidence: selection.confidence,
                reason: selection.reason,
                handoffFrom: context.currentAgent
            });

            // Update user preferences with the selected agent
            await this.updateUserPreferences(context.sessionId, {
                lastAgentUsed: selection.selectedAgent
            });

            console.log(`[AgentOrchestrator] Selected agent: ${selection.selectedAgent} (confidence: ${selection.confidence})`);
            
            return selection;

        } catch (error) {
            console.error('[AgentOrchestrator] Agent selection failed:', error);
            
            // Return fallback selection
            const fallbackAgent = this.getFallbackAgent();
            
            // Still update agent history for fallback
            try {
                await this.updateAgentHistory(context.sessionId, {
                    agentName: fallbackAgent,
                    timestamp: new Date(),
                    confidence: 0.1,
                    reason: `Fallback selection due to error: ${(error as Error).message}`,
                    handoffFrom: context.currentAgent
                });
            } catch (historyError) {
                console.warn('[AgentOrchestrator] Failed to update agent history for fallback:', historyError);
            }
            
            return {
                selectedAgent: fallbackAgent,
                confidence: 0.1,
                reason: `Fallback selection due to error: ${(error as Error).message}`,
                fallbackAgents: Array.from(this.agents.keys()).filter(name => name !== fallbackAgent)
            };
        }
    }

    /**
     * Delegate a task to a specific agent
     */
    async delegateTask(task: Task, targetAgent: string): Promise<TaskResult> {
        const startTime = Date.now();
        
        try {
            const agent = this.agents.get(targetAgent);
            if (!agent) {
                throw new Error(`Agent '${targetAgent}' not found`);
            }

            console.log(`[AgentOrchestrator] Delegating task ${task.id} to ${targetAgent}`);

            // Create orchestration context
            const context: OrchestrationContext = {
                sessionId: task.parameters.sessionId || 'default',
                userInput: task.input,
                currentAgent: targetAgent,
                availableAgents: Array.from(this.agents.keys())
            };

            // Share state if enabled
            if (this.delegationConfig.enableStateSharing) {
                await this.shareTaskContext(task, context);
            }

            // Execute task with timeout
            const result = await this.executeWithTimeout(
                () => agent.processMessage(task.input, context.sessionId),
                this.delegationConfig.timeoutMs
            );

            const executionTime = Date.now() - startTime;
            this.orchestrationStats.successfulDelegations++;

            const taskResult: TaskResult = {
                taskId: task.id,
                success: true,
                result: result,
                executedBy: targetAgent,
                executionTime,
                metadata: {
                    orchestrationContext: context,
                    agentCapabilities: agent.getCapabilities()
                }
            };

            console.log(`[AgentOrchestrator] Task ${task.id} completed successfully by ${targetAgent} in ${executionTime}ms`);
            return taskResult;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.orchestrationStats.failedDelegations++;

            console.error(`[AgentOrchestrator] Task ${task.id} failed:`, error);

            // Try fallback strategy if configured
            if (this.delegationConfig.fallbackStrategy !== 'best-effort') {
                return this.handleTaskFailure(task, targetAgent, error as Error);
            }

            return {
                taskId: task.id,
                success: false,
                error: (error as Error).message,
                executedBy: targetAgent,
                executionTime
            };
        }
    }

    /**
     * Handle conversation handoff between agents
     */
    async handleConversationHandoff(fromAgent: string, toAgent: string, context: HandoffContext): Promise<HandoffResult> {
        try {
            console.log(`[AgentOrchestrator] Handling handoff from ${fromAgent} to ${toAgent}`);

            const targetAgent = this.agents.get(toAgent);
            if (!targetAgent) {
                throw new Error(`Target agent '${toAgent}' not found`);
            }

            // Create state context for handoff
            const stateContext = createStateContext(context.sessionId, fromAgent);

            // Store handoff information in shared state
            await this.stateManager.setSharedState(
                `handoff:${context.sessionId}:${Date.now()}`,
                {
                    fromAgent,
                    toAgent,
                    reason: context.reason,
                    conversationSummary: context.conversationSummary,
                    userIntent: context.userIntent,
                    timestamp: new Date(),
                    metadata: context.metadata
                },
                {
                    scope: 'session',
                    permissions: {
                        read: [fromAgent, toAgent, context.sessionId],
                        write: [fromAgent, toAgent],
                        delete: [fromAgent, toAgent]
                    }
                },
                stateContext
            );

            // Update session state with new active agent
            await this.stateManager.updateSessionState(
                context.sessionId,
                {
                    data: {
                        activeAgent: toAgent,
                        previousAgent: fromAgent,
                        handoffReason: context.reason,
                        handoffTimestamp: new Date()
                    }
                },
                stateContext
            );

            this.orchestrationStats.handoffs++;

            const transitionMessage = this.generateHandoffMessage(fromAgent, toAgent, context);

            console.log(`[AgentOrchestrator] Handoff completed: ${fromAgent} → ${toAgent}`);

            return {
                success: true,
                newAgent: toAgent,
                transitionMessage
            };

        } catch (error) {
            console.error('[AgentOrchestrator] Handoff failed:', error);
            
            return {
                success: false,
                newAgent: fromAgent, // Stay with current agent
                error: (error as Error).message
            };
        }
    }

    /**
     * Get orchestration statistics
     */
    getStats() {
        return {
            ...this.orchestrationStats,
            registeredAgents: this.agents.size,
            availableStrategies: Array.from(this.strategies.keys()),
            config: this.delegationConfig
        };
    }

    /**
     * Initialize built-in orchestration strategies
     */
    private initializeStrategies(): void {
        const self = this;

        // Simple strategy - round robin or first available
        this.strategies.set('simple', {
            name: 'simple',
            async selectAgent(context: OrchestrationContext, agents: Map<string, BaseAgent>): Promise<AgentSelection> {
                const availableAgents = Array.from(agents.keys());
                if (availableAgents.length === 0) {
                    throw new Error('No agents available');
                }

                // Simple selection - first available agent
                const selectedAgent = availableAgents[0];
                
                return {
                    selectedAgent,
                    confidence: 0.5,
                    reason: 'Simple strategy: first available agent',
                    fallbackAgents: availableAgents.slice(1)
                };
            },
            async shouldHandoff(): Promise<boolean> {
                return false; // Simple strategy doesn't recommend handoffs
            }
        });

        // Capability-based strategy with enhanced specialized agent routing
        this.strategies.set('capability-based', {
            name: 'capability-based',
            async selectAgent(context: OrchestrationContext, agents: Map<string, BaseAgent>): Promise<AgentSelection> {
                const input = context.userInput.toLowerCase();
                
                // Enhanced routing logic for specialized agents
                const specializedRouting = self.routeToSpecializedAgent(input, agents);
                if (specializedRouting) {
                    return specializedRouting;
                }

                // Fallback to original capability scoring for non-specialized agents
                const scores: AgentScore[] = [];

                for (const [name, agent] of agents.entries()) {
                    const capabilities = agent.getCapabilities();
                    const score = self.calculateCapabilityScore(context.userInput, capabilities);
                    
                    scores.push({
                        agent: name,
                        score: score.total,
                        reasons: score.reasons,
                        capabilities
                    });
                }

                // Sort by score (descending)
                scores.sort((a, b) => b.score - a.score);

                if (scores.length === 0) {
                    throw new Error('No agents available for capability scoring');
                }

                const best = scores[0];
                const confidence = Math.min(best.score / 100, 1.0); // Normalize to 0-1

                return {
                    selectedAgent: best.agent,
                    confidence,
                    reason: `Capability-based selection: ${best.reasons.join(', ')}`,
                    fallbackAgents: scores.slice(1, 3).map(s => s.agent)
                };
            },
            async shouldHandoff(currentAgent: string, context: OrchestrationContext, agents: Map<string, BaseAgent>): Promise<boolean> {
                // Check if there's a significantly better agent for the current input
                const currentAgentScore = self.calculateCapabilityScore(
                    context.userInput, 
                    agents.get(currentAgent)?.getCapabilities()
                );
                
                let bestScore = currentAgentScore.total;
                for (const [name, agent] of agents.entries()) {
                    if (name === currentAgent) continue;
                    
                    const score = self.calculateCapabilityScore(context.userInput, agent.getCapabilities());
                    if (score.total > bestScore + 20) { // Significant improvement threshold
                        return true;
                    }
                }
                
                return false;
            }
        });

        // Keyword-based strategy
        this.strategies.set('keyword-based', {
            name: 'keyword-based',
            async selectAgent(context: OrchestrationContext, agents: Map<string, BaseAgent>): Promise<AgentSelection> {
                const input = context.userInput.toLowerCase();
                const scores: AgentScore[] = [];

                for (const [name, agent] of agents.entries()) {
                    const capabilities = agent.getCapabilities();
                    const score = self.calculateKeywordScore(input, capabilities);
                    
                    scores.push({
                        agent: name,
                        score: score.total,
                        reasons: score.reasons,
                        capabilities
                    });
                }

                scores.sort((a, b) => b.score - a.score);

                if (scores.length === 0) {
                    throw new Error('No agents available for keyword scoring');
                }

                const best = scores[0];
                const confidence = Math.min(best.score / 50, 1.0); // Normalize to 0-1

                return {
                    selectedAgent: best.agent,
                    confidence,
                    reason: `Keyword-based selection: ${best.reasons.join(', ')}`,
                    fallbackAgents: scores.slice(1, 3).map(s => s.agent)
                };
            },
            async shouldHandoff(): Promise<boolean> {
                return false; // Keyword strategy doesn't recommend handoffs
            }
        });

        console.log(`[AgentOrchestrator] Initialized ${this.strategies.size} orchestration strategies`);
    }

    /**
     * Calculate capability-based score for agent selection
     */
    private calculateCapabilityScore(input: string, capabilities?: AgentCapabilities): { total: number; reasons: string[] } {
        if (!capabilities) {
            return { total: 0, reasons: ['No capabilities available'] };
        }

        let score = 0;
        const reasons: string[] = [];

        // Base score for having capabilities
        score += 10;
        reasons.push('Base capability score');

        // Score based on supported features
        const inputLower = input.toLowerCase();
        
        // Check for specific feature keywords
        const featureKeywords: Record<string, string[]> = {
            'analysis': ['analyze', 'analysis', 'data', 'statistics'],
            'text processing': ['text', 'process', 'format', 'transform'],
            'file management': ['file', 'directory', 'path', 'upload'],
            'conversation': ['chat', 'talk', 'conversation', 'discuss'],
            'tools': ['tool', 'function', 'execute', 'run'],
            'state': ['remember', 'save', 'store', 'recall']
        };

        for (const feature of capabilities.features) {
            const keywords = featureKeywords[feature.toLowerCase()] || [];
            const matchCount = keywords.filter((keyword: string) => inputLower.includes(keyword)).length;
            
            if (matchCount > 0) {
                const featureScore = matchCount * 15;
                score += featureScore;
                reasons.push(`Feature match: ${feature} (+${featureScore})`);
            }
        }

        // Score based on supported modes
        if (capabilities.supportedModes.includes('interactive')) {
            score += 5;
            reasons.push('Supports interactive mode (+5)');
        }

        // Bonus for tool support if input suggests tool usage
        if (capabilities.supportsTools && (inputLower.includes('tool') || inputLower.includes('function'))) {
            score += 20;
            reasons.push('Tool support match (+20)');
        }

        // Bonus for state sharing if input suggests memory/context
        if (capabilities.supportsStateSharing && (inputLower.includes('remember') || inputLower.includes('context'))) {
            score += 15;
            reasons.push('State sharing support (+15)');
        }

        return { total: score, reasons };
    }

    /**
     * Calculate keyword-based score for agent selection
     */
    private calculateKeywordScore(input: string, capabilities: AgentCapabilities): { total: number; reasons: string[] } {
        let score = 0;
        const reasons: string[] = [];

        // Agent type specific keywords
        const agentKeywords: Record<string, string[]> = {
            'zero': ['general', 'chat', 'conversation', 'help', 'assistant'],
            'router': ['route', 'classify', 'categorize', 'direct'],
            'analyzer': ['analyze', 'data', 'statistics', 'report'],
            'processor': ['process', 'transform', 'convert', 'format'],
            'manager': ['manage', 'organize', 'control', 'admin']
        };

        const agentType = capabilities.name.toLowerCase();
        for (const [type, keywords] of Object.entries(agentKeywords)) {
            if (agentType.includes(type)) {
                const matchCount = keywords.filter(keyword => input.includes(keyword)).length;
                if (matchCount > 0) {
                    const typeScore = matchCount * 10;
                    score += typeScore;
                    reasons.push(`Agent type match: ${type} (+${typeScore})`);
                }
            }
        }

        return { total: score, reasons };
    }

    /**
     * Route requests to specialized agents based on content analysis
     */
    private routeToSpecializedAgent(input: string, agents: Map<string, BaseAgent>): AgentSelection | null {
        const inputLower = input.toLowerCase();
        
        // Analytical agent patterns
        const analyticalPatterns = [
            'analyze', 'analysis', 'data', 'research', 'investigate', 'examine', 'study', 'evaluate',
            'statistics', 'metrics', 'report', 'findings', 'insights', 'trends', 'patterns',
            'compare', 'contrast', 'assess', 'review', 'breakdown', 'deep dive', 'explore'
        ];

        // Creative agent patterns
        const creativePatterns = [
            'create', 'creative', 'write', 'story', 'poem', 'article', 'blog', 'content',
            'brainstorm', 'ideate', 'imagine', 'design', 'craft', 'compose', 'generate',
            'innovative', 'original', 'artistic', 'inspiration', 'narrative', 'fiction',
            'tell', 'tale', 'novel', 'character', 'plot', 'creative writing', 'storytelling',
            'fantasy', 'adventure', 'romance', 'mystery', 'drama', 'comedy', 'script'
        ];

        // Technical agent patterns
        const technicalPatterns = [
            'code', 'coding', 'program', 'programming', 'debug', 'debugging', 'fix', 'error',
            'function', 'class', 'method', 'algorithm', 'software', 'development', 'api',
            'database', 'sql', 'javascript', 'python', 'java', 'react', 'node', 'typescript',
            'architecture', 'optimization', 'performance', 'testing', 'deployment', 'git'
        ];

        // Count pattern matches for each category
        const analyticalScore = this.countPatternMatches(inputLower, analyticalPatterns);
        const creativeScore = this.countPatternMatches(inputLower, creativePatterns);
        const technicalScore = this.countPatternMatches(inputLower, technicalPatterns);

        // Determine the highest scoring category with minimum threshold
        const minThreshold = 1; // At least one keyword match required
        const scores = [
            { type: 'AnalyticalAgent', score: analyticalScore, patterns: analyticalPatterns },
            { type: 'CreativeAgent', score: creativeScore, patterns: creativePatterns },
            { type: 'TechnicalAgent', score: technicalScore, patterns: technicalPatterns }
        ];

        // Sort by score (descending)
        scores.sort((a, b) => b.score - a.score);
        const topScore = scores[0];

        // Check if we have a clear winner above threshold and the agent exists
        if (topScore.score >= minThreshold && agents.has(topScore.type)) {
            // Calculate confidence based on score and gap from second place
            const secondScore = scores[1].score;
            const scoreGap = topScore.score - secondScore;
            let confidence = Math.min(0.7 + (scoreGap * 0.1) + (topScore.score * 0.05), 0.95);

            // Boost confidence for very clear matches
            if (topScore.score >= 3) confidence = Math.min(confidence + 0.1, 0.95);
            if (scoreGap >= 2) confidence = Math.min(confidence + 0.05, 0.95);

            const matchedKeywords = topScore.patterns.filter(pattern => inputLower.includes(pattern));
            
            return {
                selectedAgent: topScore.type,
                confidence,
                reason: `Specialized agent routing: ${topScore.type} (score: ${topScore.score}, keywords: ${matchedKeywords.slice(0, 3).join(', ')})`,
                fallbackAgents: scores.slice(1).filter(s => agents.has(s.type)).map(s => s.type)
            };
        }

        // No clear specialized routing found
        return null;
    }

    /**
     * Count pattern matches in input text
     */
    private countPatternMatches(input: string, patterns: string[]): number {
        return patterns.reduce((count, pattern) => {
            return count + (input.includes(pattern) ? 1 : 0);
        }, 0);
    }

    /**
     * Get fallback agent when selection fails
     */
    private getFallbackAgent(): string {
        // Return first available agent
        const availableAgents = Array.from(this.agents.keys());
        return availableAgents.length > 0 ? availableAgents[0] : 'unknown';
    }

    /**
     * Share task context in state management
     */
    private async shareTaskContext(task: Task, context: OrchestrationContext): Promise<void> {
        const stateContext = createStateContext(context.sessionId, context.currentAgent);
        
        await this.stateManager.setSharedState(
            `task:${task.id}`,
            {
                task,
                context,
                timestamp: new Date()
            },
            {
                scope: 'session',
                permissions: {
                    read: context.availableAgents,
                    write: [context.currentAgent || 'orchestrator'],
                    delete: [context.currentAgent || 'orchestrator']
                }
            },
            stateContext
        );
    }

    /**
     * Execute operation with timeout
     */
    private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            operation()
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * Handle task failure with fallback strategies
     */
    private async handleTaskFailure(task: Task, failedAgent: string, error: Error): Promise<TaskResult> {
        console.log(`[AgentOrchestrator] Handling task failure for ${task.id}, trying fallback strategy: ${this.delegationConfig.fallbackStrategy}`);

        const availableAgents = Array.from(this.agents.keys()).filter(name => name !== failedAgent);
        
        if (availableAgents.length === 0) {
            return {
                taskId: task.id,
                success: false,
                error: `No fallback agents available. Original error: ${error.message}`,
                executedBy: failedAgent,
                executionTime: 0
            };
        }

        switch (this.delegationConfig.fallbackStrategy) {
            case 'sequential':
                return this.trySequentialFallback(task, availableAgents, error);
            case 'parallel':
                return this.tryParallelFallback(task, availableAgents, error);
            default:
                return {
                    taskId: task.id,
                    success: false,
                    error: `Fallback strategy '${this.delegationConfig.fallbackStrategy}' not implemented. Original error: ${error.message}`,
                    executedBy: failedAgent,
                    executionTime: 0
                };
        }
    }

    /**
     * Try sequential fallback strategy
     */
    private async trySequentialFallback(task: Task, agents: string[], originalError: Error): Promise<TaskResult> {
        for (const agentName of agents) {
            try {
                console.log(`[AgentOrchestrator] Trying fallback agent: ${agentName}`);
                return await this.delegateTask(task, agentName);
            } catch (fallbackError) {
                console.warn(`[AgentOrchestrator] Fallback agent ${agentName} also failed:`, fallbackError);
                continue;
            }
        }

        return {
            taskId: task.id,
            success: false,
            error: `All fallback agents failed. Original error: ${originalError.message}`,
            executedBy: 'fallback-sequence',
            executionTime: 0
        };
    }

    /**
     * Try parallel fallback strategy
     */
    private async tryParallelFallback(task: Task, agents: string[], originalError: Error): Promise<TaskResult> {
        const fallbackPromises = agents.map(agentName => 
            this.delegateTask(task, agentName).catch(error => ({ error, agent: agentName }))
        );

        try {
            const results = await Promise.allSettled(fallbackPromises);
            
            // Find first successful result
            for (const result of results) {
                if (result.status === 'fulfilled' && !('error' in result.value)) {
                    return result.value as TaskResult;
                }
            }

            return {
                taskId: task.id,
                success: false,
                error: `All parallel fallback agents failed. Original error: ${originalError.message}`,
                executedBy: 'parallel-fallback',
                executionTime: 0
            };

        } catch (error) {
            return {
                taskId: task.id,
                success: false,
                error: `Parallel fallback failed: ${(error as Error).message}. Original error: ${originalError.message}`,
                executedBy: 'parallel-fallback',
                executionTime: 0
            };
        }
    }

    /**
     * Generate handoff transition message
     */
    private generateHandoffMessage(fromAgent: string, toAgent: string, context: HandoffContext): string {
        const templates = [
            `I'm transferring you to ${toAgent} who can better help with ${context.userIntent}.`,
            `Let me connect you with ${toAgent} for specialized assistance with ${context.userIntent}.`,
            `${toAgent} is better equipped to handle ${context.userIntent}. Transferring you now.`,
            `I'll hand you over to ${toAgent} who specializes in ${context.userIntent}.`
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];
        return template;
    }

    /**
     * Update average selection time
     */
    private updateAverageSelectionTime(newTime: number): void {
        const totalRequests = this.orchestrationStats.totalRequests;
        const currentAverage = this.orchestrationStats.averageSelectionTime;
        
        this.orchestrationStats.averageSelectionTime = 
            ((currentAverage * (totalRequests - 1)) + newTime) / totalRequests;
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        console.log('[AgentOrchestrator] Cleaning up resources...');
        
        // Cleanup all registered agents
        for (const agent of this.agents.values()) {
            if (agent.cleanup) {
                try {
                    await agent.cleanup();
                } catch (error) {
                    console.warn('[AgentOrchestrator] Error cleaning up agent:', error);
                }
            }
        }

        this.agents.clear();
        this.strategies.clear();
        
        console.log('[AgentOrchestrator] Cleanup completed');
    }

    /**
     * Update agent history in session state
     */
    private async updateAgentHistory(sessionId: string, interaction: {
        agentName: string;
        timestamp: Date;
        confidence: number;
        reason: string;
        handoffFrom?: string;
    }): Promise<void> {
        try {
            const context = createStateContext(sessionId, 'AgentOrchestrator');
            const sessionResult = await this.stateManager.getSessionState(sessionId, context);
            
            if (sessionResult.success && sessionResult.data) {
                const sessionState = sessionResult.data;
                
                // Initialize agent history if it doesn't exist
                if (!sessionState.agentHistory) {
                    sessionState.agentHistory = [];
                }
                
                // Add new interaction
                sessionState.agentHistory.push({
                    agentName: interaction.agentName,
                    timestamp: interaction.timestamp,
                    confidence: interaction.confidence,
                    reason: interaction.reason,
                    handoffFrom: interaction.handoffFrom
                });
                
                // Keep only the last 50 interactions to prevent memory bloat
                if (sessionState.agentHistory.length > 50) {
                    sessionState.agentHistory = sessionState.agentHistory.slice(-50);
                }
                
                // Update session state
                await this.stateManager.updateSessionState(sessionId, sessionState, context);
                
                console.log(`[AgentOrchestrator] Updated agent history for session ${sessionId}: ${interaction.agentName}`);
            }
        } catch (error) {
            console.warn(`[AgentOrchestrator] Failed to update agent history for session ${sessionId}:`, error);
        }
    }

    /**
     * Update user preferences in session state
     */
    private async updateUserPreferences(sessionId: string, preferences: {
        lastAgentUsed?: string;
        preferredAgent?: string;
        agentLock?: boolean;
        agentLockTimestamp?: Date;
    }): Promise<void> {
        try {
            const context = createStateContext(sessionId, 'AgentOrchestrator');
            const sessionResult = await this.stateManager.getSessionState(sessionId, context);
            
            if (sessionResult.success && sessionResult.data) {
                const sessionState = sessionResult.data;
                
                // Initialize user preferences if they don't exist
                if (!sessionState.userPreferences) {
                    sessionState.userPreferences = {
                        crossSessionMemory: false,
                        agentLock: false
                    };
                }
                
                // Update preferences
                Object.assign(sessionState.userPreferences, preferences);
                
                // Update session state - only update the userPreferences field
                await this.stateManager.updateSessionState(
                    sessionId, 
                    { userPreferences: sessionState.userPreferences }, 
                    context
                );
                
                console.log(`[AgentOrchestrator] Updated user preferences for session ${sessionId}:`, preferences);
            }
        } catch (error) {
            console.warn(`[AgentOrchestrator] Failed to update user preferences for session ${sessionId}:`, error);
        }
    }
}

/**
 * Create and configure a default orchestrator instance
 */
export function createDefaultOrchestrator(config?: Partial<DelegationConfig>): AgentOrchestrator {
    return new AgentOrchestrator(config);
}

/**
 * Orchestrator factory with preset configurations
 */
export class OrchestratorFactory {
    static createDevelopmentOrchestrator(): AgentOrchestrator {
        return new AgentOrchestrator({
            maxRetries: 2,
            timeoutMs: 15000,
            fallbackStrategy: 'sequential',
            enableStateSharing: true,
            enableConversationHistory: true
        });
    }

    static createProductionOrchestrator(): AgentOrchestrator {
        return new AgentOrchestrator({
            maxRetries: 3,
            timeoutMs: 30000,
            fallbackStrategy: 'parallel',
            enableStateSharing: true,
            enableConversationHistory: true
        });
    }

    static createLightweightOrchestrator(): AgentOrchestrator {
        return new AgentOrchestrator({
            maxRetries: 1,
            timeoutMs: 10000,
            fallbackStrategy: 'best-effort',
            enableStateSharing: false,
            enableConversationHistory: false
        });
    }
}