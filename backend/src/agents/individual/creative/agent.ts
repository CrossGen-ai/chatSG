/**
 * Creative Agent Implementation
 * 
 * Specialized agent for creative writing, brainstorming, and ideation tasks.
 * Provides comprehensive creative capabilities with LLM integration.
 */

import { AbstractBaseAgent } from '../../core/BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult } from '../../../types';

// Import LLM helper for actual LLM processing
const { getLLMHelper } = require('../../../../utils/llm-helper');

/**
 * Creative Agent implementation
 */
export class CreativeAgent extends AbstractBaseAgent {
    private initialized: boolean = false;
    private llmHelper: any;
    private llm: any;

    constructor() {
        super(
            'CreativeAgent',
            '1.0.0',
            'Specialized agent for creative writing, brainstorming, and ideation tasks',
            'creative'
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
            console.log(`[${this.name}] Initializing creative agent...`);
            
            // Validate LLM configuration
            const validation = this.llmHelper.validateConfiguration();
            if (!validation.valid) {
                throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
            }

            this.initialized = true;
            console.log(`[${this.name}] Creative agent initialized successfully`);
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

            console.log(`[${this.name}] Processing creative request: "${input.substring(0, 100)}..."`);

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
                    creativeType: taskType,
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
                message: `I encountered an error while processing your creative request: ${(error as Error).message}`,
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
        const basePrompt = `You are an expert creative agent specializing in writing, brainstorming, and ideation. You provide imaginative, engaging, and original creative content.`;

        const taskSpecificPrompts: { [key: string]: string } = {
            writing: `${basePrompt}

FOCUS: Creative Writing
- Create engaging narratives with compelling characters and plots
- Use vivid descriptions and sensory details
- Maintain consistent tone and style throughout
- Incorporate literary devices effectively`,

            brainstorming: `${basePrompt}

FOCUS: Brainstorming and Ideation
- Generate diverse and innovative ideas
- Think outside the box and challenge assumptions
- Build upon ideas to create comprehensive solutions
- Consider multiple perspectives and approaches`,

            storytelling: `${basePrompt}

FOCUS: Storytelling
- Craft compelling narratives with clear structure
- Develop interesting characters with depth and motivation
- Create engaging dialogue and realistic interactions
- Build tension and maintain reader interest`,

            design: `${basePrompt}

FOCUS: Creative Design Concepts
- Develop innovative design concepts and approaches
- Consider user experience and aesthetic appeal
- Balance creativity with functionality
- Suggest unique visual and interactive elements`,

            general: `${basePrompt}

FOCUS: General Creative Tasks
- Apply creative thinking to any challenge
- Generate original and imaginative solutions
- Combine different concepts in novel ways
- Express ideas in engaging and accessible ways`
        };

        const prompt = taskSpecificPrompts[taskType] || taskSpecificPrompts.general;

        return `${prompt}

CONTEXT:
- Session: ${context.sessionId}
- Timestamp: ${context.timestamp}
- Task Type: ${context.taskType}

INSTRUCTIONS:
- Be creative, original, and engaging
- Use vivid language and compelling descriptions
- Structure your response clearly with appropriate formatting
- If creating content, make it immersive and interesting
- Ask clarifying questions if you need more details about the creative direction`;
    }

    /**
     * Analyze task type from input
     */
    private analyzeTask(input: string): string {
        const lowerInput = input.toLowerCase();
        
        // Writing keywords
        if (lowerInput.includes('write') || lowerInput.includes('story') || 
            lowerInput.includes('poem') || lowerInput.includes('script') ||
            lowerInput.includes('article') || lowerInput.includes('essay') ||
            lowerInput.includes('novel') || lowerInput.includes('chapter')) {
            return 'writing';
        }
        
        // Brainstorming keywords
        if (lowerInput.includes('brainstorm') || lowerInput.includes('idea') || 
            lowerInput.includes('concept') || lowerInput.includes('think of') ||
            lowerInput.includes('come up with') || lowerInput.includes('suggest') ||
            lowerInput.includes('generate ideas')) {
            return 'brainstorming';
        }
        
        // Storytelling keywords
        if (lowerInput.includes('tell') || lowerInput.includes('narrative') || 
            lowerInput.includes('plot') || lowerInput.includes('character') ||
            lowerInput.includes('dialogue') || lowerInput.includes('scene')) {
            return 'storytelling';
        }
        
        // Design keywords
        if (lowerInput.includes('design') || lowerInput.includes('creative concept') || 
            lowerInput.includes('visual') || lowerInput.includes('layout') ||
            lowerInput.includes('aesthetic') || lowerInput.includes('style')) {
            return 'design';
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
            supportedModes: ['writing', 'brainstorming', 'storytelling', 'design'],
            features: [
                'creative_writing',
                'brainstorming_and_ideation',
                'storytelling',
                'content_creation',
                'design_concepts',
                'llm_integration'
            ],
            inputTypes: ['text', 'creative_prompts', 'story_concepts'],
            outputTypes: ['creative_content', 'stories', 'ideas', 'concepts'],
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