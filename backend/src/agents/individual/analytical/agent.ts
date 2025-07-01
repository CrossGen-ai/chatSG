/**
 * Analytical Agent Implementation
 * 
 * Specialized agent for data analysis, statistical computations, and research tasks.
 * Provides comprehensive analytical capabilities with LLM integration.
 */

import { AbstractBaseAgent } from '../../core/BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult } from '../../../types';

// Import LLM helper for actual LLM processing
// const { getLLMHelper } = require('../../../../utils/llm-helper');

// Declare the require function for legacy modules
declare const require: any;

export class AnalyticalAgent extends AbstractBaseAgent {
    private initialized: boolean = false;
    private llmHelper: any;
    private llm: any;

    constructor() {
        super(
            'AnalyticalAgent',
            '1.0.0',
            'Specialized agent for data analysis, statistical computations, and research tasks',
            'analytical'
        );
        
        // Initialize LLM helper with proper error handling
        try {
            const { getLLMHelper } = require('../../../../../utils/llm-helper');
            this.llmHelper = getLLMHelper();
            this.llm = this.llmHelper.createChatLLM();
        } catch (error) {
            console.warn(`[${this.name}] LLM helper not available:`, error);
            this.llmHelper = null;
            this.llm = null;
        }
    }

    /**
     * Initialize the agent
     */
    async initialize(configOverride?: any): Promise<void> {
        try {
            console.log(`[${this.name}] Initializing analytical agent...`);
            
            // Validate LLM configuration if LLM helper is available
            if (this.llmHelper) {
                const validation = this.llmHelper.validateConfiguration();
                if (!validation.valid) {
                    throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
                }
            }

            this.initialized = true;
            console.log(`[${this.name}] Analytical agent initialized successfully`);
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

            // Check if LLM is available
            if (!this.llmHelper || !this.llm) {
                console.warn(`[${this.name}] LLM not available, providing fallback response`);
                return {
                    success: true,
                    message: "I'm an analytical agent, but my advanced LLM capabilities are currently unavailable. I can still help with basic analytical tasks. Please describe what you'd like me to analyze.",
                    sessionId,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        agentName: this.name,
                        agentType: this.type,
                        llmUsed: false,
                        fallbackMode: true
                    }
                };
            }

            console.log(`[${this.name}] Processing analytical request: "${input.substring(0, 100)}..."`);

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

            // Build context messages with conversation history
            const messages = await this.buildContextMessages(sessionId, input, systemPrompt);

            console.log(`[${this.name}] Calling LLM with ${messages.length} messages (including conversation history)`);

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
                    analysisType: taskType,
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
                message: `I encountered an error while processing your analytical request: ${(error as Error).message}`,
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
        const basePrompt = `You are an expert analytical agent specializing in data analysis, statistics, and research. You provide thorough, accurate, and insightful analysis.`;

        const taskSpecificPrompts: { [key: string]: string } = {
            statistics: `${basePrompt}

FOCUS: Statistical Analysis
- Perform detailed statistical calculations and interpretations
- Explain methodology and assumptions clearly
- Provide confidence intervals and significance levels where appropriate
- Suggest additional analyses that might be valuable`,

            visualization: `${basePrompt}

FOCUS: Data Visualization
- Recommend appropriate chart types for the data
- Explain visualization best practices
- Suggest color schemes and layout improvements
- Consider accessibility and clarity in recommendations`,

            research: `${basePrompt}

FOCUS: Research and Data Discovery
- Suggest reliable data sources and methodologies
- Explain research design considerations
- Recommend data collection strategies
- Identify potential biases and limitations`,

            general: `${basePrompt}

FOCUS: General Analytical Tasks
- Break down complex problems into manageable components
- Apply analytical thinking and logical reasoning
- Provide evidence-based insights and recommendations
- Explain your analytical process clearly`
        };

        const prompt = taskSpecificPrompts[taskType] || taskSpecificPrompts.general;

        return `${prompt}

CONTEXT:
- Session: ${context.sessionId}
- Timestamp: ${context.timestamp}
- Task Type: ${context.taskType}

INSTRUCTIONS:
- Provide detailed, accurate analysis
- Show your reasoning and methodology
- Use specific examples when helpful
- Format your response clearly with headers and bullet points
- If you need more information, ask specific questions`;
    }

    /**
     * Analyze task type from input
     */
    private analyzeTask(input: string): string {
        const lowerInput = input.toLowerCase();
        
        // Statistical analysis keywords
        if (lowerInput.includes('statistic') || lowerInput.includes('average') || 
            lowerInput.includes('median') || lowerInput.includes('correlation') ||
            lowerInput.includes('calculate') || lowerInput.includes('mean') ||
            lowerInput.includes('variance') || lowerInput.includes('distribution')) {
            return 'statistics';
        }
        
        // Visualization keywords
        if (lowerInput.includes('chart') || lowerInput.includes('graph') || 
            lowerInput.includes('plot') || lowerInput.includes('visual') ||
            lowerInput.includes('dashboard') || lowerInput.includes('diagram')) {
            return 'visualization';
        }
        
        // Research keywords
        if (lowerInput.includes('research') || lowerInput.includes('find data') || 
            lowerInput.includes('source') || lowerInput.includes('study') ||
            lowerInput.includes('investigate') || lowerInput.includes('explore')) {
            return 'research';
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
            supportedModes: ['analysis', 'statistics', 'visualization', 'research'],
            features: [
                'statistical_analysis',
                'data_visualization_guidance', 
                'mathematical_computation',
                'data_research_assistance',
                'numerical_processing',
                'llm_integration'
            ],
            inputTypes: ['text', 'numbers', 'data_descriptions'],
            outputTypes: ['analysis_results', 'recommendations', 'calculations'],
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