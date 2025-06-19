"use strict";
const { getLLMHelper } = require('../../utils/llm-helper');
class AgentRouter {
    constructor() {
        // Initialize LLM using the helper utility
        this.llmHelper = getLLMHelper();
        // Validate configuration
        const validation = this.llmHelper.validateConfiguration();
        if (!validation.valid) {
            console.error('[AgentRouter] LLM configuration validation failed:', validation.errors);
            throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
        }
        // Create LLM instance
        this.llm = this.llmHelper.createChatLLM();
        // Log configuration info
        const configInfo = this.llmHelper.getConfigInfo();
        console.log(`[AgentRouter] Initialized with ${configInfo.provider} provider, model: ${configInfo.model}`);
        // Cache for target agent configurations
        this.agentConfigCache = new Map();
        // Initialize AgentRouter configuration
        this.config = this.llmHelper.getAgentConfig('AgentRouter');
        if (!this.config) {
            console.warn('[AgentRouter] AgentRouter configuration not found, using minimal fallback');
        }
    }
    /**
     * Main method to classify user input and select optimal prompt variant
     * @param {string} userInput - The user's input message to classify
     * @param {string} targetAgent - The target agent name (e.g., 'AgentZero')
     * @param {Object} context - Additional context for classification
     * @returns {Object} Classification result with selected variant and reasoning
     */
    async classifyPrompt(userInput, targetAgent, context = {}) {
        try {
            console.log(`[AgentRouter] Classifying prompt for ${targetAgent}: "${userInput.substring(0, 50)}..."`);
            // Validate inputs
            if (!userInput || typeof userInput !== 'string') {
                throw new Error('Invalid user input provided');
            }
            if (!targetAgent || typeof targetAgent !== 'string') {
                throw new Error('Invalid target agent provided');
            }
            // Get available variants for target agent
            const availableVariants = this.getAvailableVariants(targetAgent);
            if (!availableVariants || availableVariants.length === 0) {
                console.warn(`[AgentRouter] No variants found for ${targetAgent}, falling back to default`);
                return this.createFallbackResponse(targetAgent, 'No variants available');
            }
            // Build classification context
            const classificationContext = {
                targetAgent: targetAgent,
                availableVariants: availableVariants.join(', '),
                userInput: userInput,
                sessionId: context.sessionId || 'default',
                userPreferences: context.userPreferences || '',
                analysisType: context.analysisType || 'quick',
                sessionContext: context.sessionContext || '',
                timestamp: new Date().toISOString(),
                ...context
            };
            // Get classification prompt
            const analysisMode = this.selectAnalysisMode(userInput, context);
            const systemPrompt = this.llmHelper.getSystemPrompt(`AgentRouter.${analysisMode}`, classificationContext);
            // Build classification request
            const classificationPrompt = this.buildClassificationPrompt(userInput, targetAgent, availableVariants, classificationContext);
            // Create messages for LLM
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: classificationPrompt }
            ];
            console.log(`[AgentRouter] Using ${analysisMode} analysis mode for classification`);
            // Get LLM response
            const response = await this.llm.invoke(messages);
            const classificationResult = response.content;
            // Parse and validate response
            const parsedResult = this.parseClassificationResponse(classificationResult, availableVariants);
            if (!parsedResult.isValid) {
                console.warn(`[AgentRouter] Invalid LLM response, falling back: ${parsedResult.error}`);
                return this.createFallbackResponse(targetAgent, parsedResult.error);
            }
            console.log(`[AgentRouter] Successfully classified: ${parsedResult.selectedVariant} (confidence: ${parsedResult.confidence})`);
            return {
                success: true,
                selectedVariant: parsedResult.selectedVariant,
                fullVariantPath: `${targetAgent}.${parsedResult.selectedVariant}`,
                reasoning: parsedResult.reasoning,
                confidence: parsedResult.confidence,
                analysisMode: analysisMode,
                targetAgent: targetAgent,
                availableVariants: availableVariants,
                timestamp: classificationContext.timestamp,
                fallbackUsed: false
            };
        }
        catch (error) {
            console.error(`[AgentRouter] Error in classifyPrompt: ${error.message}`);
            return this.createFallbackResponse(targetAgent, error.message);
        }
    }
    /**
     * Get available prompt variants for a target agent
     * @param {string} targetAgent - The target agent name
     * @returns {Array} Array of available variant names
     */
    getAvailableVariants(targetAgent) {
        try {
            // Check cache first
            if (this.agentConfigCache.has(targetAgent)) {
                const cachedVariants = this.agentConfigCache.get(targetAgent);
                console.log(`[AgentRouter] Using cached variants for ${targetAgent}: ${cachedVariants.join(', ')}`);
                return cachedVariants;
            }
            // Load target agent configuration
            const agentConfig = this.llmHelper.getAgentConfig(targetAgent);
            if (!agentConfig || !agentConfig.prompts || !agentConfig.prompts.system) {
                console.warn(`[AgentRouter] No system prompts found for agent: ${targetAgent}`);
                return ['default'];
            }
            // Extract variant names (exclude 'blank' variants)
            const variants = Object.keys(agentConfig.prompts.system)
                .filter(variant => variant !== 'blank' && agentConfig.prompts.system[variant].trim() !== '');
            // Cache the variants
            this.agentConfigCache.set(targetAgent, variants);
            console.log(`[AgentRouter] Loaded variants for ${targetAgent}: ${variants.join(', ')}`);
            return variants;
        }
        catch (error) {
            console.error(`[AgentRouter] Error getting variants for ${targetAgent}: ${error.message}`);
            return ['default'];
        }
    }
    /**
     * Select analysis mode based on input complexity and context
     * @param {string} userInput - The user input
     * @param {Object} context - Classification context
     * @returns {string} Analysis mode (quick, detailed, default)
     */
    selectAnalysisMode(userInput, context = {}) {
        try {
            // Check if detailed analysis is explicitly requested
            if (context.analysisType === 'detailed') {
                return 'detailed';
            }
            // Check input complexity indicators
            const input = userInput.toLowerCase();
            const complexityIndicators = [
                'comprehensive', 'detailed', 'thorough', 'analyze', 'compare', 'evaluate',
                'multiple', 'various', 'different', 'complex', 'sophisticated'
            ];
            const hasComplexity = complexityIndicators.some(indicator => input.includes(indicator));
            const isLongInput = userInput.length > 200;
            const hasMultipleSentences = userInput.split(/[.!?]+/).length > 2;
            if (hasComplexity || isLongInput || hasMultipleSentences) {
                return 'detailed';
            }
            return 'quick';
        }
        catch (error) {
            console.warn(`[AgentRouter] Error selecting analysis mode: ${error.message}`);
            return 'default';
        }
    }
    /**
     * Build the classification prompt for the LLM
     * @param {string} userInput - User input to classify
     * @param {string} targetAgent - Target agent name
     * @param {Array} availableVariants - Available prompt variants
     * @param {Object} context - Classification context
     * @returns {string} Formatted classification prompt
     */
    buildClassificationPrompt(userInput, targetAgent, availableVariants, context) {
        const prompt = `
Please analyze the following user input and select the most appropriate prompt variant for ${targetAgent}.

User Input: "${userInput}"

Available Variants: ${availableVariants.join(', ')}

Context:
- Session: ${context.sessionId}
- User Preferences: ${context.userPreferences || 'None specified'}
- Previous Context: ${context.sessionContext || 'None'}

Please respond in the following format:
SELECTED_VARIANT: [variant_name]
CONFIDENCE: [0.0-1.0]
REASONING: [brief explanation of why this variant was selected]

Consider:
1. User intent (question, request, command, analysis, creation)
2. Domain (technical, analytical, creative, conversational, educational)
3. Complexity level (simple, moderate, complex)
4. Context and user preferences
        `.trim();
        return prompt;
    }
    /**
     * Parse and validate the LLM classification response
     * @param {string} response - Raw LLM response
     * @param {Array} availableVariants - Valid variant options
     * @returns {Object} Parsed result with validation status
     */
    parseClassificationResponse(response, availableVariants) {
        try {
            const lines = response.split('\n').map(line => line.trim()).filter(line => line);
            let selectedVariant = null;
            let confidence = 0.5;
            let reasoning = 'No reasoning provided';
            for (const line of lines) {
                if (line.startsWith('SELECTED_VARIANT:')) {
                    selectedVariant = line.replace('SELECTED_VARIANT:', '').trim();
                }
                else if (line.startsWith('CONFIDENCE:')) {
                    const confStr = line.replace('CONFIDENCE:', '').trim();
                    const confNum = parseFloat(confStr);
                    if (!isNaN(confNum) && confNum >= 0 && confNum <= 1) {
                        confidence = confNum;
                    }
                }
                else if (line.startsWith('REASONING:')) {
                    reasoning = line.replace('REASONING:', '').trim();
                }
            }
            // Validate selected variant
            if (!selectedVariant || !availableVariants.includes(selectedVariant)) {
                return {
                    isValid: false,
                    error: `Invalid variant selected: ${selectedVariant}. Available: ${availableVariants.join(', ')}`
                };
            }
            // Check confidence threshold
            const threshold = this.config?.behavior?.classification?.confidenceThreshold || 0.5;
            if (confidence < threshold) {
                console.warn(`[AgentRouter] Low confidence (${confidence}) below threshold (${threshold})`);
            }
            return {
                isValid: true,
                selectedVariant: selectedVariant,
                confidence: confidence,
                reasoning: reasoning
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: `Error parsing response: ${error.message}`
            };
        }
    }
    /**
     * Create fallback response using keyword-based classification
     * @param {string} targetAgent - Target agent name
     * @param {string} error - Error that triggered fallback
     * @returns {Object} Fallback classification result
     */
    createFallbackResponse(targetAgent, error) {
        console.log(`[AgentRouter] Creating fallback response for ${targetAgent}: ${error}`);
        return {
            success: true,
            selectedVariant: 'default',
            fullVariantPath: `${targetAgent}.default`,
            reasoning: `Fallback to default variant due to: ${error}`,
            confidence: 0.3,
            analysisMode: 'fallback',
            targetAgent: targetAgent,
            availableVariants: ['default'],
            timestamp: new Date().toISOString(),
            fallbackUsed: true,
            fallbackReason: error
        };
    }
    /**
     * Validate classification response format and content
     * @param {Object} result - Classification result to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateClassificationResponse(result) {
        try {
            const requiredFields = ['success', 'selectedVariant', 'fullVariantPath', 'reasoning', 'confidence', 'targetAgent'];
            for (const field of requiredFields) {
                if (!(field in result)) {
                    console.error(`[AgentRouter] Missing required field in response: ${field}`);
                    return false;
                }
            }
            // Validate confidence range
            if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
                console.error(`[AgentRouter] Invalid confidence value: ${result.confidence}`);
                return false;
            }
            // Validate variant format
            if (!result.selectedVariant || typeof result.selectedVariant !== 'string') {
                console.error(`[AgentRouter] Invalid selected variant: ${result.selectedVariant}`);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error(`[AgentRouter] Error validating response: ${error.message}`);
            return false;
        }
    }
    /**
     * Clear agent configuration cache
     * @param {string} targetAgent - Optional specific agent to clear, or all if not provided
     */
    clearCache(targetAgent = null) {
        if (targetAgent) {
            this.agentConfigCache.delete(targetAgent);
            console.log(`[AgentRouter] Cleared cache for agent: ${targetAgent}`);
        }
        else {
            this.agentConfigCache.clear();
            console.log(`[AgentRouter] Cleared all agent configuration cache`);
        }
    }
    /**
     * Get classification statistics and performance info
     * @returns {Object} Performance and configuration info
     */
    getInfo() {
        const configInfo = this.llmHelper.getConfigInfo();
        return {
            agentName: 'AgentRouter',
            version: this.config?.agentInfo?.version || '1.0.0',
            llmProvider: configInfo.provider,
            model: configInfo.model,
            environment: configInfo.environment,
            cachedAgents: Array.from(this.agentConfigCache.keys()),
            configurationLoaded: !!this.config,
            classificationStrategy: this.config?.behavior?.promptSelection?.strategy || 'llm-based-classification'
        };
    }
}
module.exports = AgentRouter;
//# sourceMappingURL=agent.js.map