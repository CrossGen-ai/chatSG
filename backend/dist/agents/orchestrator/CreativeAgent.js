"use strict";
/**
 * Creative Agent Implementation
 *
 * Specialized agent for creative writing, brainstorming, and innovative thinking tasks.
 * Extends SpecializedLLMAgent to provide creative capabilities through
 * the orchestrator system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreativeAgent = void 0;
const SpecializedLLMAgent_1 = require("./SpecializedLLMAgent");
/**
 * Agent specialized for creative tasks including writing, brainstorming,
 * storytelling, and innovative problem-solving
 */
class CreativeAgent extends SpecializedLLMAgent_1.SpecializedLLMAgent {
    constructor() {
        super('CreativeAgent', 'creative', 'Specialized agent for creative writing, brainstorming, and innovative thinking tasks');
    }
    /**
     * Get specialized prompt for creative tasks
     * Creates a creative-focused prompt since there's no specific 'creative' prompt in llm-helper
     */
    getSpecializedPrompt(context) {
        // Create a creative prompt by enhancing the default prompt with creative instructions
        const creativeInstructions = `You are a creative AI assistant specializing in creative writing, brainstorming, and innovative thinking. Your strengths include:

- Creative Writing: Crafting engaging stories, poems, scripts, and creative content
- Brainstorming: Generating innovative ideas and solutions through creative thinking
- Storytelling: Developing compelling narratives with rich characters and plots
- Innovation: Approaching problems with creative and unconventional solutions
- Ideation: Helping users explore new concepts and creative possibilities

Be imaginative, expressive, and encourage creative exploration. Think outside the box and help users unlock their creative potential. Use vivid language, metaphors, and creative techniques to inspire and engage.`;
        const enhancedContext = {
            ...context,
            agentType: 'creative',
            specialization: 'creative writing and innovation',
            capabilities: 'creative writing, brainstorming, storytelling, innovation',
            instructions: 'Be imaginative, expressive, and encourage creative exploration'
        };
        // Use default prompt as base and add creative instructions
        const basePrompt = this.llmHelper.getSystemPrompt('default', enhancedContext);
        return `${creativeInstructions}\n\n${basePrompt}`;
    }
    /**
     * Get enhanced capabilities specific to creative work
     */
    getCapabilities() {
        const baseCapabilities = super.getCapabilities();
        return {
            ...baseCapabilities,
            name: 'CreativeAgent',
            supportedModes: [
                'creative',
                'writing',
                'brainstorming',
                'storytelling',
                'ideation',
                'innovation',
                'artistic'
            ],
            features: [
                ...baseCapabilities.features,
                'creative_writing',
                'storytelling',
                'brainstorming',
                'ideation',
                'narrative_development',
                'character_creation',
                'plot_development',
                'creative_problem_solving',
                'artistic_expression',
                'metaphor_generation'
            ],
            inputTypes: ['text', 'creative_prompt', 'story_concept'],
            outputTypes: ['text', 'creative_content', 'story', 'ideas'],
            supportsTools: true, // Creative agents can benefit from research and inspiration tools
            supportsStateSharing: true
        };
    }
    /**
     * Enhanced processMessage for creative tasks
     * Adds creative context and inspiration
     */
    async processMessage(input, sessionId) {
        console.log(`[${this.name}] Processing creative request: "${input.substring(0, 50)}..."`);
        // Check if this is a creative task and what type
        const creativeTaskType = this.identifyCreativeTask(input);
        if (creativeTaskType) {
            console.log(`[${this.name}] Detected creative task type: ${creativeTaskType}`);
        }
        // Call parent implementation with enhanced logging
        const result = await super.processMessage(input, sessionId);
        // Add creative metadata to response
        if (result.metadata) {
            result.metadata.creativeTaskType = creativeTaskType;
            result.metadata.creativeApproach = this.getCreativeApproach(input);
            result.metadata.inspirationLevel = this.getInspirationLevel(input);
        }
        return result;
    }
    /**
     * Identify the type of creative task being requested
     */
    identifyCreativeTask(input) {
        const lowerInput = input.toLowerCase();
        // Creative writing keywords
        if (lowerInput.includes('write') || lowerInput.includes('story') || lowerInput.includes('poem')) {
            return 'creative_writing';
        }
        // Brainstorming keywords
        if (lowerInput.includes('brainstorm') || lowerInput.includes('ideas') || lowerInput.includes('think of')) {
            return 'brainstorming';
        }
        // Storytelling keywords
        if (lowerInput.includes('tell') || lowerInput.includes('narrative') || lowerInput.includes('plot')) {
            return 'storytelling';
        }
        // Character development keywords
        if (lowerInput.includes('character') || lowerInput.includes('protagonist') || lowerInput.includes('hero')) {
            return 'character_development';
        }
        // Innovation keywords
        if (lowerInput.includes('innovate') || lowerInput.includes('creative solution') || lowerInput.includes('new approach')) {
            return 'innovation';
        }
        // Artistic expression keywords
        if (lowerInput.includes('artistic') || lowerInput.includes('express') || lowerInput.includes('creative')) {
            return 'artistic_expression';
        }
        // Script/dialogue keywords
        if (lowerInput.includes('script') || lowerInput.includes('dialogue') || lowerInput.includes('conversation')) {
            return 'script_writing';
        }
        return null;
    }
    /**
     * Determine the creative approach based on input
     */
    getCreativeApproach(input) {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('formal') || lowerInput.includes('professional') || lowerInput.includes('business')) {
            return 'structured_creative';
        }
        if (lowerInput.includes('fun') || lowerInput.includes('playful') || lowerInput.includes('whimsical')) {
            return 'playful_creative';
        }
        if (lowerInput.includes('serious') || lowerInput.includes('dramatic') || lowerInput.includes('intense')) {
            return 'dramatic_creative';
        }
        if (lowerInput.includes('experimental') || lowerInput.includes('avant-garde') || lowerInput.includes('unconventional')) {
            return 'experimental_creative';
        }
        return 'balanced_creative';
    }
    /**
     * Assess the inspiration level needed for the task
     */
    getInspirationLevel(input) {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('inspire') || lowerInput.includes('motivate') || lowerInput.includes('spark')) {
            return 'high_inspiration';
        }
        if (lowerInput.includes('practical') || lowerInput.includes('realistic') || lowerInput.includes('grounded')) {
            return 'moderate_inspiration';
        }
        if (lowerInput.includes('simple') || lowerInput.includes('straightforward') || lowerInput.includes('basic')) {
            return 'low_inspiration';
        }
        return 'adaptive_inspiration';
    }
    /**
     * Get creative agent information
     */
    getInfo() {
        const baseInfo = super.getInfo();
        return {
            ...baseInfo,
            specialization: 'creative',
            creativeCapabilities: [
                'Creative Writing',
                'Storytelling',
                'Brainstorming',
                'Character Development',
                'Plot Creation',
                'Artistic Expression',
                'Innovation',
                'Ideation'
            ],
            optimalFor: [
                'Content Creation',
                'Story Development',
                'Marketing Copy',
                'Creative Problem Solving',
                'Artistic Projects',
                'Innovation Workshops',
                'Scriptwriting',
                'Poetry and Literature'
            ],
            creativeStyles: [
                'Narrative Fiction',
                'Poetry',
                'Screenwriting',
                'Marketing Creative',
                'Technical Writing with Flair',
                'Educational Content',
                'Humor and Satire'
            ]
        };
    }
}
exports.CreativeAgent = CreativeAgent;
