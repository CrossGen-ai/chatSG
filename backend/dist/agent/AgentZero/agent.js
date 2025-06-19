"use strict";
const { StateGraph, Annotation, END } = require('@langchain/langgraph');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { InMemoryChatMessageHistory } = require('@langchain/core/chat_history');
const { getLLMHelper } = require('../../utils/llm-helper');
const AgentRouter = require('../AgentRouter/agent');
class AgentZero {
    constructor() {
        // Initialize LLM using the helper utility
        this.llmHelper = getLLMHelper();
        // Validate configuration
        const validation = this.llmHelper.validateConfiguration();
        if (!validation.valid) {
            console.error('[AgentZero] LLM configuration validation failed:', validation.errors);
            throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
        }
        // Create LLM instance
        this.llm = this.llmHelper.createChatLLM();
        // Log configuration info
        const configInfo = this.llmHelper.getConfigInfo();
        console.log(`[AgentZero] Initialized with ${configInfo.provider} provider, model: ${configInfo.model}`);
        // Initialize AgentRouter for intelligent prompt classification
        try {
            this.agentRouter = new AgentRouter();
            this.useIntelligentClassification = true;
            console.log('[AgentZero] AgentRouter initialized successfully for intelligent prompt classification');
        }
        catch (error) {
            console.warn(`[AgentZero] Failed to initialize AgentRouter: ${error.message}`);
            console.warn('[AgentZero] Falling back to keyword-based classification');
            this.agentRouter = null;
            this.useIntelligentClassification = false;
        }
        // Session memory storage
        this.sessions = new Map();
        // Classification result storage for metadata access
        this.lastClassificationResult = null;
        // Create the graph
        this.graph = this.createGraph();
    }
    // Get or create session memory
    getSessionMemory(sessionId) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, new InMemoryChatMessageHistory());
        }
        return this.sessions.get(sessionId);
    }
    // Define the agent state
    createGraph() {
        try {
            // Define the state structure using modern Annotation.Root API
            const StateAnnotation = Annotation.Root({
                messages: Annotation({
                    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
                    default: () => [],
                }),
                sessionId: Annotation({
                    reducer: (left, right) => right ?? left,
                    default: () => 'default',
                }),
            });
            // Create the graph with modern API
            const workflow = new StateGraph(StateAnnotation);
            console.log('[AgentZero] StateGraph initialized successfully with Annotation.Root API');
            // Add nodes
            workflow.addNode('agent', this.agentNode.bind(this));
            workflow.addNode('memory', this.memoryNode.bind(this));
            // Define the flow
            workflow.setEntryPoint('memory');
            workflow.addEdge('memory', 'agent');
            workflow.addEdge('agent', END);
            return workflow.compile();
        }
        catch (error) {
            console.error('[AgentZero] StateGraph initialization failed:', error.message);
            console.error('[AgentZero] Stack trace:', error.stack);
            throw new Error(`Failed to initialize StateGraph: ${error.message}`);
        }
    }
    // Memory node - loads chat history
    async memoryNode(state) {
        const { sessionId } = state;
        const memory = this.getSessionMemory(sessionId);
        const history = await memory.getMessages();
        console.log(`[AgentZero] Loading ${history.length} messages from session: ${sessionId}`);
        return {
            messages: [...history, ...state.messages],
        };
    }
    // Agent node - processes with LLM
    async agentNode(state) {
        const { messages, sessionId } = state;
        try {
            console.log(`[AgentZero] Processing message for session: ${sessionId}`);
            // Get the latest human message
            const latestMessage = messages[messages.length - 1];
            const userInput = latestMessage.content || '';
            // Determine prompt variant based on user input and context
            const promptVariant = await this.selectPromptVariant(userInput, sessionId);
            console.log(`[AgentZero] Selected prompt variant: ${promptVariant}`);
            // Get comprehensive classification metadata from stored results
            const classificationData = this.getClassificationMetadata(promptVariant, userInput);
            console.log(`[AgentZero] Classification metadata: method=${classificationData.method}, confidence=${classificationData.confidence}, mode=${classificationData.mode}`);
            // Create enhanced context for template substitution
            const context = {
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                userInput: userInput,
                mode: classificationData.mode,
                confidence: classificationData.confidence,
                reasoning: classificationData.reasoning,
                classificationMethod: classificationData.method,
                customInstructions: this.llmHelper.getAgentPrompt('AgentZero', 'customInstructions.fullContext', {
                    sessionId: sessionId,
                    timestamp: new Date().toISOString(),
                    mode: classificationData.mode
                })
            };
            // Create system message using property-based prompt selection
            const systemPrompt = this.llmHelper.getSystemPrompt(promptVariant, context);
            const systemMessage = {
                role: 'system',
                content: systemPrompt
            };
            // Prepare messages for LLM (include recent history for context)
            const recentMessages = messages.slice(-10); // Keep last 10 messages for context
            const llmMessages = [systemMessage, ...recentMessages];
            // Get LLM response
            const response = await this.llm.invoke(llmMessages);
            // Save to memory
            const memory = this.getSessionMemory(sessionId);
            await memory.addMessage(latestMessage);
            await memory.addMessage(response);
            console.log(`[AgentZero] Generated response for session: ${sessionId} using ${promptVariant}`);
            return {
                messages: [response],
            };
        }
        catch (error) {
            console.error('[AgentZero] Error processing message:', error);
            // Return error message
            const errorMessage = new AIMessage({
                content: `I apologize, but I encountered an error processing your request: ${error.message}. Please try again.`
            });
            return {
                messages: [errorMessage],
            };
        }
    }
    // Main method to process user input
    async processMessage(userInput, sessionId = 'default') {
        try {
            const humanMessage = new HumanMessage({ content: userInput });
            const initialState = {
                messages: [humanMessage],
                sessionId: sessionId,
            };
            console.log(`[AgentZero] Processing: "${userInput}" for session: ${sessionId}`);
            const result = await this.graph.invoke(initialState);
            const aiResponse = result.messages[result.messages.length - 1];
            // Get configuration info for response metadata
            const configInfo = this.llmHelper.getConfigInfo();
            return {
                success: true,
                message: aiResponse.content,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                llmProvider: configInfo.provider,
                model: configInfo.model,
            };
        }
        catch (error) {
            console.error('[AgentZero] Error in processMessage:', error);
            return {
                success: false,
                error: error.message,
                message: 'I apologize, but I encountered an error. Please try again.',
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
            };
        }
    }
    // Get session info
    getSessionInfo(sessionId = 'default') {
        const memory = this.getSessionMemory(sessionId);
        const configInfo = this.llmHelper.getConfigInfo();
        return {
            sessionId: sessionId,
            messageCount: memory.messages?.length || 0,
            exists: this.sessions.has(sessionId),
            llmProvider: configInfo.provider,
            model: configInfo.model,
            environment: configInfo.environment,
        };
    }
    // Clear session
    async clearSession(sessionId = 'default') {
        if (this.sessions.has(sessionId)) {
            const memory = this.sessions.get(sessionId);
            await memory.clear();
            console.log(`[AgentZero] Cleared session: ${sessionId}`);
            return true;
        }
        return false;
    }
    // Select appropriate prompt variant based on user input and context
    async selectPromptVariant(userInput, sessionId) {
        try {
            // Use intelligent classification if AgentRouter is available
            if (this.useIntelligentClassification && this.agentRouter) {
                console.log('[AgentZero] Using AgentRouter for intelligent prompt classification');
                const context = {
                    sessionId: sessionId,
                    timestamp: new Date().toISOString(),
                    analysisType: 'quick' // Use quick analysis for real-time classification
                };
                const classificationResult = await this.agentRouter.classifyPrompt(userInput, 'AgentZero', context);
                // Store classification result for metadata access
                this.lastClassificationResult = classificationResult;
                console.log(`[AgentZero] Stored classification result: success=${classificationResult.success}, fallback=${classificationResult.fallbackUsed}`);
                if (classificationResult.success && !classificationResult.fallbackUsed) {
                    console.log(`[AgentZero] AgentRouter selected: ${classificationResult.fullVariantPath} (confidence: ${classificationResult.confidence}, reasoning: ${classificationResult.reasoning})`);
                    return classificationResult.fullVariantPath;
                }
                else {
                    console.warn(`[AgentZero] AgentRouter classification failed, falling back to keyword matching: ${classificationResult.error || 'Unknown error'}`);
                    // Store fallback indicator in classification result
                    this.lastClassificationResult = {
                        success: false,
                        fallbackUsed: true,
                        confidence: 0.5,
                        reasoning: 'Fallback to keyword-based classification',
                        method: 'keyword-based',
                        error: classificationResult.error || 'AgentRouter classification failed'
                    };
                    return this.selectPromptVariantKeyword(userInput, sessionId);
                }
            }
            else {
                // Fall back to keyword-based classification
                console.log('[AgentZero] Using keyword-based prompt classification');
                // Store fallback classification result
                this.lastClassificationResult = {
                    success: false,
                    fallbackUsed: true,
                    confidence: 0.5,
                    reasoning: 'AgentRouter not available, using keyword-based classification',
                    method: 'keyword-based',
                    error: 'AgentRouter not initialized or disabled'
                };
                return this.selectPromptVariantKeyword(userInput, sessionId);
            }
        }
        catch (error) {
            console.warn(`[AgentZero] Error in intelligent prompt selection: ${error.message}`);
            console.log('[AgentZero] Falling back to keyword-based classification');
            // Store error fallback classification result
            this.lastClassificationResult = {
                success: false,
                fallbackUsed: true,
                confidence: 0.5,
                reasoning: 'Error in intelligent classification, using keyword fallback',
                method: 'keyword-based',
                error: error.message
            };
            return this.selectPromptVariantKeyword(userInput, sessionId);
        }
    }
    // Keyword-based fallback method for prompt variant selection
    selectPromptVariantKeyword(userInput, sessionId) {
        try {
            const input = userInput.toLowerCase();
            // Check for analytical keywords
            if (input.includes('analyz') || input.includes('evaluat') || input.includes('assess') ||
                input.includes('compar') || input.includes('examin') || input.includes('data') ||
                input.includes('statistic') || input.includes('metric') || input.includes('pattern')) {
                return 'AgentZero.analytical';
            }
            // Check for creative keywords
            if (input.includes('creat') || input.includes('design') || input.includes('brainstorm') ||
                input.includes('innovat') || input.includes('imagin') || input.includes('idea') ||
                input.includes('story') || input.includes('write') || input.includes('art')) {
                return 'AgentZero.creative';
            }
            // Check for technical keywords
            if (input.includes('code') || input.includes('program') || input.includes('debug') ||
                input.includes('function') || input.includes('algorithm') || input.includes('api') ||
                input.includes('database') || input.includes('server') || input.includes('technical') ||
                input.includes('implement') || input.includes('syntax') || input.includes('error')) {
                return 'AgentZero.technical';
            }
            // Check for conversational keywords or questions
            if (input.includes('how are you') || input.includes('what do you think') ||
                input.includes('tell me about') || input.includes('explain') || input.includes('discuss') ||
                input.includes('chat') || input.includes('talk') || input.includes('conversation')) {
                return 'AgentZero.conversational';
            }
            // Default to standard AgentZero prompt
            return 'AgentZero';
        }
        catch (error) {
            console.warn(`[AgentZero] Error selecting prompt variant: ${error.message}`);
            return 'AgentZero'; // Fallback to default
        }
    }
    // Extract mode from AgentRouter variant path (e.g., 'AgentZero.analytical' → 'analytical')
    extractModeFromVariant(fullVariantPath) {
        try {
            // Validate input
            if (!fullVariantPath || typeof fullVariantPath !== 'string') {
                console.warn(`[AgentZero] Invalid variant path provided: ${fullVariantPath}`);
                return 'default';
            }
            // Split on '.' and get the second part as mode
            const parts = fullVariantPath.split('.');
            // Handle both 'AgentZero.analytical' and 'AgentZero' formats
            if (parts.length > 1 && parts[1].trim() !== '') {
                return parts[1].trim();
            }
            // Return 'default' for single-part paths or empty second parts
            return 'default';
        }
        catch (error) {
            console.warn(`[AgentZero] Error extracting mode from variant path: ${error.message}`);
            return 'default';
        }
    }
    // Get comprehensive classification metadata for template context
    getClassificationMetadata(promptVariant, userInput) {
        try {
            // Extract mode from variant path
            const mode = this.extractModeFromVariant(promptVariant);
            // Check if we have intelligent classification results available
            const hasIntelligentResult = this.lastClassificationResult &&
                this.lastClassificationResult.success &&
                !this.lastClassificationResult.fallbackUsed;
            if (hasIntelligentResult) {
                // Use AgentRouter metadata for intelligent classification
                return {
                    mode: mode,
                    confidence: this.lastClassificationResult.confidence || 0.5,
                    reasoning: this.lastClassificationResult.reasoning || 'Intelligent classification',
                    method: 'intelligent',
                    analysisMode: this.lastClassificationResult.analysisMode || 'default'
                };
            }
            else {
                // Provide fallback metadata for keyword-based classification
                return {
                    mode: mode,
                    confidence: 0.5, // Default confidence for keyword matching
                    reasoning: 'Keyword-based classification fallback',
                    method: 'keyword-based',
                    analysisMode: 'fallback'
                };
            }
        }
        catch (error) {
            console.warn(`[AgentZero] Error getting classification metadata: ${error.message}`);
            // Return safe fallback metadata
            return {
                mode: 'default',
                confidence: 0.5,
                reasoning: 'Error in classification metadata extraction',
                method: 'fallback',
                analysisMode: 'error'
            };
        }
    }
    // Get LLM configuration info
    getLLMInfo() {
        return this.llmHelper.getConfigInfo();
    }
    // Enable or disable intelligent classification
    setIntelligentClassification(enabled) {
        if (enabled && !this.agentRouter) {
            console.warn('[AgentZero] Cannot enable intelligent classification: AgentRouter not available');
            return false;
        }
        this.useIntelligentClassification = enabled;
        console.log(`[AgentZero] Intelligent classification ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }
    // Get classification status and statistics
    getClassificationInfo() {
        return {
            intelligentClassificationEnabled: this.useIntelligentClassification,
            agentRouterAvailable: !!this.agentRouter,
            classificationMethod: this.useIntelligentClassification && this.agentRouter ? 'intelligent' : 'keyword-based'
        };
    }
    // Fallback agent node for simpler MessagesState
    async agentNodeFallback(state) {
        try {
            console.log('[AgentZero] Using fallback agent node');
            // Get system prompt with new prompt system (fallback to legacy if config missing)
            const systemPrompt = this.llmHelper.getSystemPrompt('AgentZero', {
                customInstructions: 'Operating in fallback mode'
            });
            const systemMessage = {
                role: 'system',
                content: systemPrompt
            };
            // Prepare messages
            const messages = [systemMessage, ...state.messages];
            // Get LLM response
            const response = await this.llm.invoke(messages);
            console.log('[AgentZero] Generated response with fallback using new prompt system');
            return {
                messages: [response],
            };
        }
        catch (error) {
            console.error('[AgentZero] Error in fallback agent node:', error);
            const errorMessage = new AIMessage({
                content: `I apologize, but I encountered an error: ${error.message}. Please try again.`
            });
            return {
                messages: [errorMessage],
            };
        }
    }
}
module.exports = AgentZero;
//# sourceMappingURL=agent.js.map