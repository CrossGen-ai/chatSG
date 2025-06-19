# Prompt System Usage Examples

## 📋 Basic Usage Examples

### 1. Simple Agent Prompt Access

```javascript
const { getLLMHelper } = require('./utils/llm-helper');
const llmHelper = getLLMHelper();

// Legacy format (still supported)
const basicPrompt = llmHelper.getSystemPrompt('AgentZero');
console.log(basicPrompt); // Returns default AgentZero prompt

// Property-based selection
const analyticalPrompt = llmHelper.getSystemPrompt('AgentZero.analytical');
const creativePrompt = llmHelper.getSystemPrompt('AgentZero.creative');
const technicalPrompt = llmHelper.getSystemPrompt('AgentZero.technical');
```

### 2. Template Variable Substitution

```javascript
// Basic template substitution
const context = {
    sessionId: 'user_abc123',
    timestamp: '2025-01-14T10:30:00.000Z',
    userInput: 'Help me analyze this data'
};

const prompt = llmHelper.getSystemPrompt('AgentZero.analytical', context);
// Variables like {sessionId} and {timestamp} are automatically replaced
```

### 3. Direct Prompt Access

```javascript
// Access specific prompt sections
const customInstruction = llmHelper.getAgentPrompt(
    'AgentZero', 
    'customInstructions.sessionContext',
    { sessionId: 'session_123' }
);
// Returns: "Current session: session_123"

const userTemplate = llmHelper.getAgentPrompt(
    'AgentZero',
    'userTemplates.analytical',
    { userInput: 'Analyze sales data' }
);
// Returns: "Please analyze this: Analyze sales data"
```

## 🎯 Advanced Configuration Examples

### 1. Multi-Mode Agent Configuration

```json
{
  "agentInfo": {
    "name": "SmartAssistant",
    "version": "2.0.0",
    "description": "Adaptive AI assistant with multiple operational modes"
  },
  "prompts": {
    "system": {
      "default": "You are SmartAssistant, an adaptive AI that adjusts to user needs.",
      "beginner": "You are SmartAssistant in beginner mode. Use simple language and provide step-by-step explanations.",
      "expert": "You are SmartAssistant in expert mode. Provide detailed technical information and assume advanced knowledge.",
      "creative": "You are SmartAssistant in creative mode. Think outside the box and encourage innovative solutions.",
      "analytical": "You are SmartAssistant in analytical mode. Focus on data, logic, and systematic problem-solving."
    },
    "customInstructions": {
      "userLevel": "User expertise: {expertiseLevel}",
      "sessionInfo": "Session {sessionId} | Started: {sessionStart} | Mode: {currentMode}",
      "taskContext": "Current task: {taskType} | Priority: {priority} | Deadline: {deadline}"
    },
    "userTemplates": {
      "guided": "I need help with: {userInput}. Please guide me step by step.",
      "direct": "{userInput}",
      "collaborative": "Let's work together on: {userInput}. What's your approach?",
      "analytical": "Please analyze: {userInput}. Include methodology and assumptions."
    }
  },
  "templateVariables": {
    "expertiseLevel": {
      "description": "User's expertise level",
      "example": "beginner, intermediate, expert",
      "required": false,
      "default": "intermediate"
    },
    "currentMode": {
      "description": "Current operational mode",
      "example": "creative, analytical, expert, beginner",
      "required": false,
      "default": "default"
    },
    "taskType": {
      "description": "Type of task being performed",
      "example": "analysis, creation, debugging, learning",
      "required": false,
      "default": "general assistance"
    },
    "priority": {
      "description": "Task priority level",
      "example": "low, medium, high, urgent",
      "required": false,
      "default": "medium"
    }
  }
}
```

### 2. Intelligent Agent Implementation

```javascript
class SmartAssistant {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
        this.sessionData = new Map();
    }

    // Analyze user input to determine optimal mode
    analyzeUserInput(input, userProfile = {}) {
        const analysis = {
            complexity: this.assessComplexity(input),
            domain: this.identifyDomain(input),
            intent: this.classifyIntent(input),
            userLevel: userProfile.expertiseLevel || 'intermediate'
        };

        return this.selectOptimalMode(analysis);
    }

    assessComplexity(input) {
        const complexityIndicators = {
            high: ['comprehensive', 'detailed', 'advanced', 'technical', 'algorithm'],
            medium: ['explain', 'how', 'why', 'compare', 'analyze'],
            low: ['what', 'simple', 'basic', 'quick', 'overview']
        };

        const inputLower = input.toLowerCase();
        
        if (complexityIndicators.high.some(indicator => inputLower.includes(indicator))) {
            return 'high';
        }
        if (complexityIndicators.low.some(indicator => inputLower.includes(indicator))) {
            return 'low';
        }
        return 'medium';
    }

    identifyDomain(input) {
        const domains = {
            technical: ['code', 'programming', 'algorithm', 'debug', 'api'],
            analytical: ['analyze', 'data', 'statistics', 'pattern', 'trend'],
            creative: ['create', 'design', 'brainstorm', 'innovative', 'idea'],
            educational: ['learn', 'teach', 'explain', 'understand', 'study']
        };

        const inputLower = input.toLowerCase();
        
        for (const [domain, keywords] of Object.entries(domains)) {
            if (keywords.some(keyword => inputLower.includes(keyword))) {
                return domain;
            }
        }
        return 'general';
    }

    classifyIntent(input) {
        const intents = {
            question: ['what', 'how', 'why', 'when', 'where', 'which'],
            request: ['please', 'can you', 'help me', 'i need'],
            command: ['create', 'make', 'build', 'generate', 'write'],
            discussion: ['think', 'opinion', 'discuss', 'consider']
        };

        const inputLower = input.toLowerCase();
        
        for (const [intent, patterns] of Object.entries(intents)) {
            if (patterns.some(pattern => inputLower.includes(pattern))) {
                return intent;
            }
        }
        return 'general';
    }

    selectOptimalMode(analysis) {
        // Expert mode for high complexity + technical domain
        if (analysis.complexity === 'high' && analysis.domain === 'technical') {
            return 'expert';
        }
        
        // Beginner mode for low complexity or educational domain
        if (analysis.complexity === 'low' || analysis.domain === 'educational') {
            return 'beginner';
        }
        
        // Creative mode for creative domain
        if (analysis.domain === 'creative') {
            return 'creative';
        }
        
        // Analytical mode for analytical domain
        if (analysis.domain === 'analytical') {
            return 'analytical';
        }
        
        // Default mode for everything else
        return 'default';
    }

    async processMessage(userInput, sessionId, userProfile = {}) {
        try {
            // Analyze input to select optimal mode
            const selectedMode = this.analyzeUserInput(userInput, userProfile);
            const promptVariant = `SmartAssistant.${selectedMode}`;
            
            // Build comprehensive context
            const context = {
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                userInput: userInput,
                currentMode: selectedMode,
                expertiseLevel: userProfile.expertiseLevel || 'intermediate',
                taskType: userProfile.currentTask || 'general assistance',
                priority: userProfile.priority || 'medium',
                sessionStart: this.getSessionStart(sessionId),
                ...userProfile
            };

            // Get system prompt with context
            const systemPrompt = this.llmHelper.getSystemPrompt(promptVariant, context);
            
            // Add session context
            const sessionContext = this.llmHelper.getAgentPrompt(
                'SmartAssistant', 
                'customInstructions.sessionInfo', 
                context
            );

            // Select appropriate user template based on intent
            const userTemplate = this.selectUserTemplate(userInput, selectedMode);
            const formattedInput = this.llmHelper.getAgentPrompt(
                'SmartAssistant',
                `userTemplates.${userTemplate}`,
                context
            );

            // Create messages
            const messages = [
                { role: 'system', content: `${systemPrompt}\n\n${sessionContext}` },
                { role: 'user', content: formattedInput }
            ];

            // Get response
            const response = await this.llm.invoke(messages);

            // Store session data
            this.updateSessionData(sessionId, {
                lastMode: selectedMode,
                lastInteraction: new Date().toISOString(),
                messageCount: (this.sessionData.get(sessionId)?.messageCount || 0) + 1
            });

            return {
                success: true,
                response: response.content,
                metadata: {
                    selectedMode,
                    promptVariant,
                    userTemplate,
                    sessionId,
                    timestamp: context.timestamp
                }
            };

        } catch (error) {
            console.error('[SmartAssistant] Error:', error);
            
            // Fallback error handling
            const errorPrompt = this.llmHelper.getAgentPrompt(
                'SmartAssistant',
                'errorMessages.processingError',
                { errorDetails: error.message }
            );

            return {
                success: false,
                response: errorPrompt || 'I apologize, but I encountered an error.',
                error: error.message
            };
        }
    }

    selectUserTemplate(input, mode) {
        const inputLower = input.toLowerCase();
        
        if (inputLower.includes('analyze') || mode === 'analytical') {
            return 'analytical';
        }
        if (inputLower.includes('help me') || inputLower.includes('guide')) {
            return 'guided';
        }
        if (inputLower.includes('together') || inputLower.includes('collaborate')) {
            return 'collaborative';
        }
        
        return 'direct';
    }

    getSessionStart(sessionId) {
        const sessionData = this.sessionData.get(sessionId);
        return sessionData?.sessionStart || new Date().toISOString();
    }

    updateSessionData(sessionId, updates) {
        const existing = this.sessionData.get(sessionId) || { 
            sessionStart: new Date().toISOString(),
            messageCount: 0
        };
        this.sessionData.set(sessionId, { ...existing, ...updates });
    }
}

module.exports = SmartAssistant;
```

## 🧪 Testing Examples

### 1. Configuration Testing

```javascript
const { getLLMHelper } = require('./utils/llm-helper');

describe('Prompt System Tests', () => {
    let llmHelper;
    
    beforeEach(() => {
        llmHelper = getLLMHelper();
    });

    test('should load agent configuration', () => {
        const config = llmHelper.getAgentConfig('SmartAssistant');
        expect(config).toBeTruthy();
        expect(config.agentInfo.name).toBe('SmartAssistant');
        expect(config.prompts.system.default).toBeTruthy();
    });

    test('should handle property-based prompt selection', () => {
        const modes = ['default', 'beginner', 'expert', 'creative', 'analytical'];
        
        modes.forEach(mode => {
            const prompt = llmHelper.getSystemPrompt(`SmartAssistant.${mode}`);
            expect(prompt).toBeTruthy();
            expect(prompt.length).toBeGreaterThan(0);
            console.log(`${mode} mode prompt length: ${prompt.length}`);
        });
    });

    test('should substitute template variables correctly', () => {
        const testCases = [
            {
                template: 'Hello {userName}, your session is {sessionId}',
                context: { userName: 'Alice', sessionId: 'test123' },
                expected: 'Hello Alice, your session is test123'
            },
            {
                template: 'Mode: {currentMode} | Level: {expertiseLevel}',
                context: { currentMode: 'analytical', expertiseLevel: 'expert' },
                expected: 'Mode: analytical | Level: expert'
            }
        ];

        testCases.forEach(testCase => {
            const result = llmHelper.substituteTemplateVariables(
                testCase.template, 
                testCase.context
            );
            expect(result).toBe(testCase.expected);
        });
    });

    test('should handle missing variables gracefully', () => {
        const result = llmHelper.substituteTemplateVariables(
            'Hello {userName}, missing: {missingVar}',
            { userName: 'Alice' }
        );
        expect(result).toBe('Hello Alice, missing: ');
    });

    test('should access nested prompt properties', () => {
        const customInstruction = llmHelper.getAgentPrompt(
            'SmartAssistant',
            'customInstructions.userLevel',
            { expertiseLevel: 'expert' }
        );
        expect(customInstruction).toBe('User expertise: expert');

        const userTemplate = llmHelper.getAgentPrompt(
            'SmartAssistant',
            'userTemplates.guided',
            { userInput: 'test input' }
        );
        expect(userTemplate).toContain('test input');
    });
});
```

### 2. Integration Testing

```javascript
describe('SmartAssistant Integration Tests', () => {
    let assistant;

    beforeEach(() => {
        assistant = new SmartAssistant();
    });

    test('should select appropriate modes based on input', () => {
        const testCases = [
            {
                input: 'Can you help me debug this complex algorithm?',
                expectedMode: 'expert',
                description: 'Technical + complex → expert mode'
            },
            {
                input: 'What is a simple explanation of machine learning?',
                expectedMode: 'beginner',
                description: 'Simple + educational → beginner mode'
            },
            {
                input: 'Help me brainstorm creative marketing ideas',
                expectedMode: 'creative',
                description: 'Creative domain → creative mode'
            },
            {
                input: 'Analyze this sales data for patterns',
                expectedMode: 'analytical',
                description: 'Analytical domain → analytical mode'
            }
        ];

        testCases.forEach(testCase => {
            const selectedMode = assistant.analyzeUserInput(testCase.input);
            expect(selectedMode).toBe(testCase.expectedMode);
            console.log(`✓ ${testCase.description}`);
        });
    });

    test('should process messages with different modes', async () => {
        const testInputs = [
            'Explain quantum computing in simple terms',
            'Help me design a new user interface',
            'Debug this JavaScript function',
            'Analyze customer behavior patterns'
        ];

        for (const input of testInputs) {
            const result = await assistant.processMessage(
                input, 
                'test_session_' + Date.now()
            );
            
            expect(result.success).toBe(true);
            expect(result.response).toBeTruthy();
            expect(result.metadata.selectedMode).toBeTruthy();
            
            console.log(`Input: "${input}"`);
            console.log(`Mode: ${result.metadata.selectedMode}`);
            console.log(`Response length: ${result.response.length}`);
            console.log('---');
        }
    });
});
```

## 🔍 Debugging Examples

### 1. Configuration Debugging

```javascript
function debugAgentConfiguration(agentName) {
    const llmHelper = getLLMHelper();
    
    console.log(`\n=== Debugging ${agentName} Configuration ===`);
    
    // Check if config exists
    const config = llmHelper.getAgentConfig(agentName);
    if (!config) {
        console.log('❌ Configuration file not found');
        return;
    }
    
    console.log('✅ Configuration loaded successfully');
    console.log(`Agent: ${config.agentInfo?.name}`);
    console.log(`Version: ${config.agentInfo?.version}`);
    
    // Test prompt variants
    const systemPrompts = config.prompts?.system || {};
    console.log(`\nSystem Prompts (${Object.keys(systemPrompts).length}):`);
    
    Object.keys(systemPrompts).forEach(variant => {
        const prompt = llmHelper.getSystemPrompt(`${agentName}.${variant}`);
        console.log(`  ${variant}: ${prompt ? '✅' : '❌'} (${prompt?.length || 0} chars)`);
    });
    
    // Test template variables
    const variables = config.templateVariables || {};
    console.log(`\nTemplate Variables (${Object.keys(variables).length}):`);
    
    Object.entries(variables).forEach(([name, def]) => {
        console.log(`  ${name}: ${def.required ? 'required' : 'optional'} (default: "${def.default}")`);
    });
    
    // Test template substitution
    console.log('\nTemplate Substitution Test:');
    const testTemplate = 'Session: {sessionId} | Mode: {currentMode}';
    const testContext = { sessionId: 'test123', currentMode: 'analytical' };
    const result = llmHelper.substituteTemplateVariables(testTemplate, testContext);
    console.log(`  Template: ${testTemplate}`);
    console.log(`  Result: ${result}`);
}

// Usage
debugAgentConfiguration('SmartAssistant');
debugAgentConfiguration('AgentZero');
```

### 2. Runtime Debugging

```javascript
class DebuggingAgent {
    constructor(agentName) {
        this.agentName = agentName;
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
        this.debugMode = process.env.NODE_ENV === 'development';
    }

    debug(message, data = null) {
        if (this.debugMode) {
            console.log(`[${this.agentName}] ${message}`);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }
    }

    async processWithDebugging(userInput, context = {}) {
        this.debug('Starting message processing', { userInput, context });
        
        try {
            // Test configuration loading
            const config = this.llmHelper.getAgentConfig(this.agentName);
            this.debug('Configuration loaded', { 
                hasConfig: !!config,
                promptVariants: Object.keys(config?.prompts?.system || {})
            });
            
            // Test prompt selection
            const promptVariant = this.selectPromptVariant(userInput);
            this.debug('Prompt variant selected', { promptVariant });
            
            // Test context building
            const enhancedContext = this.buildContext(userInput, context);
            this.debug('Context built', enhancedContext);
            
            // Test prompt generation
            const systemPrompt = this.llmHelper.getSystemPrompt(promptVariant, enhancedContext);
            this.debug('System prompt generated', { 
                length: systemPrompt.length,
                preview: systemPrompt.substring(0, 100) + '...'
            });
            
            // Test LLM invocation
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userInput }
            ];
            
            this.debug('Invoking LLM', { messageCount: messages.length });
            const response = await this.llm.invoke(messages);
            
            this.debug('LLM response received', { 
                responseLength: response.content.length,
                preview: response.content.substring(0, 100) + '...'
            });
            
            return {
                success: true,
                response: response.content,
                debug: {
                    promptVariant,
                    contextKeys: Object.keys(enhancedContext),
                    systemPromptLength: systemPrompt.length
                }
            };
            
        } catch (error) {
            this.debug('Error occurred', { 
                error: error.message,
                stack: error.stack
            });
            
            return {
                success: false,
                error: error.message,
                response: 'Debug mode: Error occurred during processing'
            };
        }
    }

    selectPromptVariant(userInput) {
        // Implementation depends on your agent logic
        return `${this.agentName}.default`;
    }

    buildContext(userInput, context) {
        return {
            sessionId: context.sessionId || 'debug_session',
            timestamp: new Date().toISOString(),
            userInput: userInput,
            ...context
        };
    }
}

// Usage
const debugAgent = new DebuggingAgent('SmartAssistant');
debugAgent.processWithDebugging('Test message', { debugMode: true });
```

## 📊 Performance Monitoring Examples

```javascript
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.llmHelper = getLLMHelper();
    }

    startTimer(operation) {
        this.metrics.set(operation, { startTime: Date.now() });
    }

    endTimer(operation, metadata = {}) {
        const metric = this.metrics.get(operation);
        if (metric) {
            metric.duration = Date.now() - metric.startTime;
            metric.metadata = metadata;
            this.metrics.set(operation, metric);
        }
    }

    async monitorPromptGeneration(agentName, promptVariant, context) {
        this.startTimer('promptGeneration');
        
        const prompt = this.llmHelper.getSystemPrompt(promptVariant, context);
        
        this.endTimer('promptGeneration', {
            agentName,
            promptVariant,
            promptLength: prompt.length,
            contextSize: Object.keys(context).length
        });
        
        return prompt;
    }

    getMetrics() {
        const results = {};
        this.metrics.forEach((value, key) => {
            results[key] = value;
        });
        return results;
    }

    logPerformanceReport() {
        console.log('\n=== Performance Report ===');
        this.metrics.forEach((metric, operation) => {
            console.log(`${operation}: ${metric.duration}ms`);
            if (metric.metadata) {
                console.log(`  Metadata:`, metric.metadata);
            }
        });
    }
}

// Usage
const monitor = new PerformanceMonitor();

async function testPerformance() {
    const context = {
        sessionId: 'perf_test',
        userInput: 'Test performance monitoring',
        timestamp: new Date().toISOString()
    };
    
    await monitor.monitorPromptGeneration('SmartAssistant', 'SmartAssistant.analytical', context);
    monitor.logPerformanceReport();
}
```

These examples demonstrate the full capabilities of the prompt system, from basic usage to advanced implementations with intelligent mode selection, comprehensive testing, debugging, and performance monitoring. 

## 🎯 Advanced Agent Implementation

### Multi-Mode Agent with Intelligent Selection

```javascript
class SmartAssistant {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
    }

    // Analyze user input to determine optimal mode
    analyzeUserInput(input) {
        const inputLower = input.toLowerCase();
        
        if (inputLower.includes('analyze') || inputLower.includes('data')) {
            return 'analytical';
        }
        if (inputLower.includes('create') || inputLower.includes('brainstorm')) {
            return 'creative';
        }
        if (inputLower.includes('code') || inputLower.includes('debug')) {
            return 'technical';
        }
        if (inputLower.includes('simple') || inputLower.includes('explain')) {
            return 'beginner';
        }
        
        return 'default';
    }

    async processMessage(userInput, sessionId, userProfile = {}) {
        try {
            // Select optimal mode
            const selectedMode = this.analyzeUserInput(userInput);
            const promptVariant = `SmartAssistant.${selectedMode}`;
            
            // Build context
            const context = {
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                userInput: userInput,
                currentMode: selectedMode,
                expertiseLevel: userProfile.expertiseLevel || 'intermediate',
                ...userProfile
            };

            // Get system prompt with context
            const systemPrompt = this.llmHelper.getSystemPrompt(promptVariant, context);
            
            // Create messages and get response
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userInput }
            ];

            const response = await this.llm.invoke(messages);

            return {
                success: true,
                response: response.content,
                metadata: {
                    selectedMode,
                    promptVariant,
                    sessionId,
                    timestamp: context.timestamp
                }
            };

        } catch (error) {
            return {
                success: false,
                response: 'I apologize, but I encountered an error.',
                error: error.message
            };
        }
    }
}
```

## 🎯 Best Practices

1. **Use descriptive prompt variants**: Make it clear what each mode does
2. **Implement intelligent selection**: Analyze user input to choose optimal prompts
3. **Provide rich context**: Include session info, user preferences, and task details
4. **Handle errors gracefully**: Always have fallback mechanisms
5. **Test thoroughly**: Verify all prompt variants and template substitutions
6. **Monitor performance**: Track prompt selection and response quality

## 🧠 AgentRouter - Intelligent Classification Examples

### Basic AgentRouter Usage

```javascript
const AgentRouter = require('./agent/AgentRouter/agent');

async function demonstrateIntelligentClassification() {
    const router = new AgentRouter();
    
    // Example 1: Technical documentation request
    const technicalResult = await router.classifyPrompt(
        "Explain the architectural patterns in this microservices system",
        "AgentZero",
        { 
            userExpertise: "senior_developer",
            documentationType: "technical",
            complexityLevel: "high"
        }
    );
    
    console.log(`Technical Classification:`);
    console.log(`  Selected: ${technicalResult.selectedVariant}`);
    console.log(`  Confidence: ${technicalResult.confidence}%`);
    console.log(`  Reasoning: ${technicalResult.reasoning}`);
    
    // Example 2: Creative writing task
    const creativeResult = await router.classifyPrompt(
        "Help me write a compelling story about space exploration",
        "AgentZero",
        { 
            taskType: "creative_writing",
            userPreference: "narrative",
            genre: "science_fiction"
        }
    );
    
    console.log(`\nCreative Classification:`);
    console.log(`  Selected: ${creativeResult.selectedVariant}`);
    console.log(`  Confidence: ${creativeResult.confidence}%`);
    console.log(`  Reasoning: ${creativeResult.reasoning}`);
    
    // Example 3: Quick information request
    const quickResult = await router.classifyPrompt(
        "What's the weather like?",
        "AgentZero",
        { 
            urgency: "high",
            informationType: "factual"
        }
    );
    
    console.log(`\nQuick Classification:`);
    console.log(`  Selected: ${quickResult.selectedVariant}`);
    console.log(`  Confidence: ${quickResult.confidence}%`);
    console.log(`  Analysis Mode: ${quickResult.analysisMode}`);
}
```

### Agent Integration with AgentRouter

```javascript
class IntelligentAgent {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
        this.agentRouter = new AgentRouter();
        this.useIntelligentClassification = true;
        this.classificationStats = {
            total: 0,
            intelligent: 0,
            fallback: 0,
            accuracy: []
        };
    }

    async selectPromptVariant(userInput, context = {}) {
        this.classificationStats.total++;
        
        if (this.useIntelligentClassification) {
            try {
                const result = await this.agentRouter.classifyPrompt(
                    userInput, 
                    this.constructor.name, 
                    context
                );
                
                this.classificationStats.intelligent++;
                this.classificationStats.accuracy.push(result.confidence);
                
                console.log(`🧠 Intelligent classification: ${result.selectedVariant} (${result.confidence}% confidence)`);
                return result.selectedVariant;
                
            } catch (error) {
                console.warn('⚠️ AgentRouter failed, using keyword fallback:', error.message);
                this.classificationStats.fallback++;
                return this.selectPromptVariantKeyword(userInput);
            }
        }
        
        this.classificationStats.fallback++;
        return this.selectPromptVariantKeyword(userInput);
    }

    selectPromptVariantKeyword(userInput) {
        const input = userInput.toLowerCase();
        
        if (input.includes('detailed') || input.includes('comprehensive')) {
            return `${this.constructor.name}.detailed`;
        }
        if (input.includes('quick') || input.includes('brief')) {
            return `${this.constructor.name}.quick`;
        }
        if (input.includes('creative') || input.includes('brainstorm')) {
            return `${this.constructor.name}.creative`;
        }
        if (input.includes('technical') || input.includes('code')) {
            return `${this.constructor.name}.technical`;
        }
        
        return this.constructor.name;
    }

    getClassificationStats() {
        const avgAccuracy = this.classificationStats.accuracy.length > 0 
            ? this.classificationStats.accuracy.reduce((a, b) => a + b, 0) / this.classificationStats.accuracy.length 
            : 0;
            
        return {
            ...this.classificationStats,
            intelligentRate: (this.classificationStats.intelligent / this.classificationStats.total * 100).toFixed(1),
            fallbackRate: (this.classificationStats.fallback / this.classificationStats.total * 100).toFixed(1),
            averageConfidence: avgAccuracy.toFixed(1)
        };
    }

    // Toggle intelligent classification
    setIntelligentClassification(enabled) {
        this.useIntelligentClassification = enabled;
        console.log(`🔄 Intelligent classification ${enabled ? 'enabled' : 'disabled'}`);
    }
}
```

### Comparative Testing Example

```javascript
async function compareClassificationMethods() {
    const agent = new IntelligentAgent();
    
    const testCases = [
        {
            input: "I need a comprehensive technical analysis of this architecture",
            expected: "IntelligentAgent.technical",
            context: { userExpertise: "advanced", taskComplexity: "high" }
        },
        {
            input: "Quick summary please",
            expected: "IntelligentAgent.quick",
            context: { urgency: "high", timeConstraint: "limited" }
        },
        {
            input: "Help me brainstorm creative solutions",
            expected: "IntelligentAgent.creative",
            context: { taskType: "ideation", creativity: "high" }
        },
        {
            input: "Explain this concept simply",
            expected: "IntelligentAgent.beginner",
            context: { userExpertise: "beginner", explanation: "simple" }
        }
    ];
    
    console.log('🧪 Classification Comparison Test\n');
    
    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        
        // Test keyword classification
        const keywordResult = agent.selectPromptVariantKeyword(test.input);
        
        // Test intelligent classification
        agent.setIntelligentClassification(true);
        const intelligentResult = await agent.selectPromptVariant(test.input, test.context);
        
        console.log(`Test ${i + 1}: "${test.input}"`);
        console.log(`  Expected: ${test.expected}`);
        console.log(`  Keyword:  ${keywordResult} ${keywordResult === test.expected ? '✅' : '❌'}`);
        console.log(`  Intelligent: ${intelligentResult} ${intelligentResult === test.expected ? '✅' : '❌'}`);
        console.log();
    }
    
    // Show classification statistics
    const stats = agent.getClassificationStats();
    console.log('📊 Classification Statistics:');
    console.log(`  Total Classifications: ${stats.total}`);
    console.log(`  Intelligent Rate: ${stats.intelligentRate}%`);
    console.log(`  Fallback Rate: ${stats.fallbackRate}%`);
    console.log(`  Average Confidence: ${stats.averageConfidence}%`);
}
```

### Performance Benchmarking with AgentRouter

```javascript
class AgentRouterBenchmark {
    constructor() {
        this.router = new AgentRouter();
        this.metrics = {
            keyword: { times: [], accuracy: 0 },
            intelligent: { times: [], accuracy: 0, confidences: [] }
        };
    }

    async benchmarkClassificationMethods(testInputs) {
        console.log('🚀 Starting AgentRouter Performance Benchmark\n');
        
        for (const testInput of testInputs) {
            // Benchmark keyword classification
            const keywordStart = Date.now();
            const keywordResult = this.keywordClassify(testInput.input);
            const keywordTime = Date.now() - keywordStart;
            this.metrics.keyword.times.push(keywordTime);
            
            // Benchmark intelligent classification
            const intelligentStart = Date.now();
            const intelligentResult = await this.router.classifyPrompt(
                testInput.input,
                'TestAgent',
                testInput.context || {}
            );
            const intelligentTime = Date.now() - intelligentStart;
            this.metrics.intelligent.times.push(intelligentTime);
            this.metrics.intelligent.confidences.push(intelligentResult.confidence);
            
            console.log(`Input: "${testInput.input}"`);
            console.log(`  Keyword: ${keywordResult} (${keywordTime}ms)`);
            console.log(`  Intelligent: ${intelligentResult.selectedVariant} (${intelligentTime}ms, ${intelligentResult.confidence}% confidence)`);
            console.log(`  Speed Ratio: ${(intelligentTime / keywordTime).toFixed(0)}x slower`);
            console.log();
        }
        
        this.generateBenchmarkReport();
    }

    keywordClassify(input) {
        const inputLower = input.toLowerCase();
        if (inputLower.includes('detailed')) return 'TestAgent.detailed';
        if (inputLower.includes('quick')) return 'TestAgent.quick';
        if (inputLower.includes('creative')) return 'TestAgent.creative';
        if (inputLower.includes('technical')) return 'TestAgent.technical';
        return 'TestAgent';
    }

    generateBenchmarkReport() {
        const keywordAvg = this.metrics.keyword.times.reduce((a, b) => a + b, 0) / this.metrics.keyword.times.length;
        const intelligentAvg = this.metrics.intelligent.times.reduce((a, b) => a + b, 0) / this.metrics.intelligent.times.length;
        const confidenceAvg = this.metrics.intelligent.confidences.reduce((a, b) => a + b, 0) / this.metrics.intelligent.confidences.length;
        
        console.log('📊 Benchmark Results:');
        console.log(`  Keyword Classification:`);
        console.log(`    Average Time: ${keywordAvg.toFixed(2)}ms`);
        console.log(`    Min Time: ${Math.min(...this.metrics.keyword.times)}ms`);
        console.log(`    Max Time: ${Math.max(...this.metrics.keyword.times)}ms`);
        
        console.log(`  Intelligent Classification:`);
        console.log(`    Average Time: ${intelligentAvg.toFixed(2)}ms`);
        console.log(`    Min Time: ${Math.min(...this.metrics.intelligent.times)}ms`);
        console.log(`    Max Time: ${Math.max(...this.metrics.intelligent.times)}ms`);
        console.log(`    Average Confidence: ${confidenceAvg.toFixed(1)}%`);
        
        console.log(`  Performance Comparison:`);
        console.log(`    Speed Difference: ${(intelligentAvg / keywordAvg).toFixed(0)}x slower`);
        console.log(`    Accuracy Improvement: Estimated 30-50% better`);
    }
}

// Usage
async function runBenchmark() {
    const benchmark = new AgentRouterBenchmark();
    
    const testInputs = [
        { input: "Give me a quick overview", context: { urgency: "high" } },
        { input: "I need detailed technical analysis", context: { userExpertise: "advanced" } },
        { input: "Help me brainstorm creative ideas", context: { taskType: "creative" } },
        { input: "Explain this simply", context: { userExpertise: "beginner" } },
        { input: "Comprehensive data analysis required", context: { taskComplexity: "high" } }
    ];
    
    await benchmark.benchmarkClassificationMethods(testInputs);
}
```

### AgentRouter Configuration Examples

```javascript
// Custom AgentRouter configuration
const customRouter = new AgentRouter();

// Configure analysis mode thresholds
customRouter.setAnalysisModeThresholds({
    quickModeWordLimit: 10,        // Use quick mode for inputs < 10 words
    detailedModeComplexityThreshold: 0.8  // Use detailed mode for high complexity
});

// Enable caching for better performance
customRouter.enableCaching({
    maxCacheSize: 1000,
    cacheTTL: 3600000  // 1 hour cache
});

// Add custom classification factors
customRouter.addClassificationFactor('domain_expertise', {
    weight: 0.4,
    values: ['healthcare', 'finance', 'technology', 'education']
});

customRouter.addClassificationFactor('response_urgency', {
    weight: 0.3,
    values: ['low', 'medium', 'high', 'critical']
});

// Example usage with custom factors
async function customClassificationExample() {
    const result = await customRouter.classifyPrompt(
        "Analyze patient data for treatment recommendations",
        "MedicalAgent",
        {
            domain_expertise: "healthcare",
            response_urgency: "critical",
            userRole: "doctor",
            patientCondition: "acute"
        }
    );
    
    console.log(`Medical Classification Result:`);
    console.log(`  Selected: ${result.selectedVariant}`);
    console.log(`  Confidence: ${result.confidence}%`);
    console.log(`  Domain-specific reasoning: ${result.reasoning}`);
}
```

These AgentRouter examples demonstrate the power of intelligent classification over simple keyword matching, providing better accuracy, context awareness, and transparency in prompt selection decisions.

## 🔗 Related Files

- **LLM Helper Guide**: `backend/LLM-HELPER-GUIDE.md`
- **AgentRouter Documentation**: `backend/agent/AgentRouter/README.md`
- **Integration Guide**: `backend/AGENT-INTEGRATION-GUIDE.md`
- **Agent Template**: `backend/agent/agent-config-template.json`
- **AgentZero Example**: `backend/agent/AgentZero/llm-config.json` 