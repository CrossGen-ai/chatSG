/**
 * Technical Agent Implementation
 * 
 * Specialized agent for coding, debugging, and technical problem-solving tasks.
 * Provides comprehensive technical capabilities with LLM integration.
 */

import { AbstractBaseAgent } from '../../core/BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult } from '../../../types';

// Import LLM helper for actual LLM processing
const { getLLMHelper } = require('../../../../utils/llm-helper');

/**
 * Technical Agent implementation
 */
export class TechnicalAgent extends AbstractBaseAgent {
    private initialized: boolean = false;
    private llmHelper: any;
    private llm: any;

    constructor() {
        super(
            'TechnicalAgent',
            '1.0.0',
            'Specialized agent for coding, debugging, and technical problem-solving tasks',
            'technical'
        );
        
        // Initialize LLM helper
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
    }

    /**
     * Initialize the agent
     */
    async initialize(configOverride?: any): Promise<void> {
        try {
            console.log(`[${this.name}] Initializing technical agent...`);
            
            // Validate LLM configuration
            const validation = this.llmHelper.validateConfiguration();
            if (!validation.valid) {
                throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
            }

            this.initialized = true;
            console.log(`[${this.name}] Technical agent initialized successfully`);
        } catch (error) {
            console.error(`[${this.name}] Initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Process user message with LLM integration
     */
    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            console.log(`[${this.name}] Processing technical request: "${input.substring(0, 100)}..."`);

            // Analyze task type for better prompt selection
            const taskType = this.analyzeTask(input);
            console.log(`[${this.name}] Detected task type: ${taskType}`);

            // Build context for LLM
            const context = {
                sessionId,
                timestamp: new Date().toISOString(),
                userInput: input,
                taskType,
                agentName: this.name,
                agentType: this.type
            };

            // Get appropriate system prompt based on task type
            const systemPrompt = this.getSystemPrompt(taskType, context);

            // Create messages for LLM
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ];

            console.log(`[${this.name}] Calling LLM with ${messages.length} messages`);

            // Call LLM
            const response = await this.llm.invoke(messages);
            const responseContent = response.content || response;

            console.log(`[${this.name}] LLM response received (${responseContent.length} chars)`);

            return {
                success: true,
                message: responseContent,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: {
                    technicalType: taskType,
                    agentName: this.name,
                    agentType: this.type,
                    llmUsed: true,
                    responseLength: responseContent.length
                }
            };
        } catch (error) {
            console.error(`[${this.name}] Error processing message:`, error);
            return {
                success: false,
                message: `I encountered an error while processing your technical request: ${(error as Error).message}`,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: { error: true, agentName: this.name }
            };
        }
    }

    /**
     * Get appropriate system prompt based on task type
     */
    private getSystemPrompt(taskType: string, context: any): string {
        const basePrompt = `You are an expert technical agent specializing in programming, debugging, and technical problem-solving. You provide accurate, efficient, and well-explained technical solutions.`;

        const taskSpecificPrompts: { [key: string]: string } = {
            coding: `${basePrompt}

FOCUS: Programming and Code Development
- Write clean, efficient, and well-documented code
- Follow best practices and coding standards
- Explain your code choices and reasoning
- Consider performance, security, and maintainability`,

            debugging: `${basePrompt}

FOCUS: Debugging and Troubleshooting
- Systematically identify and isolate issues
- Provide step-by-step debugging approaches
- Explain root causes and prevention strategies
- Suggest testing methods to verify fixes`,

            architecture: `${basePrompt}

FOCUS: System Architecture and Design
- Design scalable and maintainable systems
- Consider performance, security, and reliability
- Explain architectural patterns and trade-offs
- Provide implementation guidance and best practices`,

            optimization: `${basePrompt}

FOCUS: Performance Optimization
- Identify performance bottlenecks and inefficiencies
- Suggest specific optimization techniques
- Consider time and space complexity
- Provide measurable improvement strategies`,

            general: `${basePrompt}

FOCUS: General Technical Problem-Solving
- Break down complex technical problems
- Apply systematic problem-solving approaches
- Provide practical and implementable solutions
- Explain technical concepts clearly and thoroughly`
        };

        const prompt = taskSpecificPrompts[taskType] || taskSpecificPrompts.general;

        return `${prompt}

CONTEXT:
- Session: ${context.sessionId}
- Timestamp: ${context.timestamp}
- Task Type: ${context.taskType}

INSTRUCTIONS:
- Provide accurate and practical technical solutions
- Include code examples when relevant (use proper formatting)
- Explain your reasoning and methodology
- Consider edge cases and potential issues
- Ask clarifying questions if you need more technical details`;
    }

    /**
     * Analyze task type from input
     */
    private analyzeTask(input: string): string {
        const lowerInput = input.toLowerCase();
        
        // Coding keywords
        if (lowerInput.includes('code') || lowerInput.includes('program') || 
            lowerInput.includes('function') || lowerInput.includes('class') ||
            lowerInput.includes('implement') || lowerInput.includes('write') ||
            lowerInput.includes('develop') || lowerInput.includes('create')) {
            return 'coding';
        }
        
        // Debugging keywords
        if (lowerInput.includes('debug') || lowerInput.includes('fix') || 
            lowerInput.includes('error') || lowerInput.includes('bug') ||
            lowerInput.includes('troubleshoot') || lowerInput.includes('issue') ||
            lowerInput.includes('problem') || lowerInput.includes('not working')) {
            return 'debugging';
        }
        
        // Architecture keywords
        if (lowerInput.includes('architecture') || lowerInput.includes('design') || 
            lowerInput.includes('system') || lowerInput.includes('structure') ||
            lowerInput.includes('pattern') || lowerInput.includes('framework') ||
            lowerInput.includes('scalable') || lowerInput.includes('microservice')) {
            return 'architecture';
        }
        
        // Optimization keywords
        if (lowerInput.includes('optimize') || lowerInput.includes('performance') || 
            lowerInput.includes('faster') || lowerInput.includes('efficient') ||
            lowerInput.includes('memory') || lowerInput.includes('speed') ||
            lowerInput.includes('bottleneck') || lowerInput.includes('improve')) {
            return 'optimization';
        }
        
        return 'general';
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): AgentCapabilities {
        return {
            name: this.name,
            version: this.version,
            supportedModes: ['coding', 'debugging', 'architecture', 'optimization'],
            features: [
                'code_development',
                'debugging_assistance',
                'system_architecture',
                'performance_optimization',
                'technical_problem_solving',
                'llm_integration'
            ],
            inputTypes: ['text', 'code_snippets', 'technical_problems'],
            outputTypes: ['code_solutions', 'technical_explanations', 'debugging_steps'],
            maxSessionMemory: 1000,
            supportsTools: true,
            supportsStateSharing: true
        };
    }

    /**
     * Validate agent configuration
     */
    validateConfig(): ValidationResult {
        try {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!this.name || !this.version) {
                errors.push('Agent name and version are required');
            }

            if (!this.initialized) {
                warnings.push('Agent not yet initialized');
            }

            // Validate LLM configuration
            const llmValidation = this.llmHelper.validateConfiguration();
            if (!llmValidation.valid) {
                errors.push(...llmValidation.errors);
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
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
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        this.initialized = false;
        console.log(`[${this.name}] Cleaned up successfully`);
    }

    /**
     * Get session information
     */
    getSessionInfo(sessionId: string): any {
        return {
            sessionId,
            agentType: this.type,
            capabilities: this.getCapabilities(),
            initialized: this.initialized,
            llmConfigured: !!this.llm
        };
    }

    /**
     * Clear session data
     */
    async clearSession(sessionId: string): Promise<void> {
        console.log(`[${this.name}] Cleared session: ${sessionId}`);
    }
} 