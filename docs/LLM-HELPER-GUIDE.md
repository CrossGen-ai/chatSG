# LLM Helper System Guide

## Overview

The LLM Helper utility provides centralized, flexible LLM configuration for the ChatSG backend, supporting both regular OpenAI and Azure OpenAI endpoints with automatic provider detection and environment-based optimization.

## 🎯 Key Features

### ✅ **Multi-Provider Support**
- **OpenAI**: Standard OpenAI API integration
- **Azure OpenAI**: Enterprise Azure OpenAI service
- **Automatic Detection**: Chooses provider based on available credentials

### ✅ **Environment-Based Configuration**
- **Development**: Higher creativity (temp: 0.7, tokens: 4000)
- **Production**: More conservative (temp: 0.3, tokens: 2000)
- **Custom Overrides**: Manual temperature and token limits

### ✅ **Centralized Management**
- **Singleton Pattern**: Single configuration instance
- **Validation**: Built-in credential and configuration validation
- **Error Handling**: Graceful fallbacks and detailed error messages

## 🔧 Configuration

### OpenAI Setup (Development)
```bash
# Add to backend/.env
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1  # optional
```

### Azure OpenAI Setup (Production)
```bash
# Add to backend/.env
AZURE_OPENAI_API_KEY=your-azure-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001  # optional, defaults to gpt-4o-001
AZURE_OPENAI_API_VERSION=2024-02-15-preview  # optional
```

### Optional Overrides
```bash
# Fine-tune behavior
LLM_TEMPERATURE=0.7      # 0.0-1.0, creativity level
LLM_MAX_TOKENS=3000      # Maximum response tokens
```

## 🚀 Usage

### Basic Usage
```javascript
const { getLLMHelper } = require('./utils/llm-helper');

// Get singleton instance
const llmHelper = getLLMHelper();

// Create configured LLM instance
const llm = llmHelper.createChatLLM();

// Get configuration info
const config = llmHelper.getConfigInfo();
console.log(`Using ${config.provider} with model ${config.model}`);
```

### Advanced Usage
```javascript
// Validate configuration
const validation = llmHelper.validateConfiguration();
if (!validation.valid) {
    console.error('Configuration errors:', validation.errors);
}

// Get system prompts
const prompt = llmHelper.getSystemPrompt('agentZero', {
    customInstructions: 'Focus on technical accuracy'
});

// Create LLM with overrides
const customLLM = llmHelper.createChatLLM({
    temperature: 0.9,
    maxTokens: 2000
});
```

## 🧪 Testing

### Test LLM Configuration
```bash
cd backend
npm run test:llm
```

### Test AgentZero Integration
```bash
cd backend
npm run test:agent
```

### Run All Tests
```bash
cd backend
npm test
```

## 🔄 Provider Detection Logic

The LLM helper automatically detects which provider to use:

1. **Azure OpenAI** - If both `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` exist
2. **OpenAI** - If `OPENAI_API_KEY` exists
3. **Default** - Falls back to OpenAI (will require credentials)

## 📊 Environment-Based Defaults

| Environment | Temperature | Max Tokens | Use Case |
|-------------|-------------|------------|----------|
| `production` | 0.3 | 2000 | Conservative, cost-effective |
| `development` | 0.7 | 4000 | Creative, generous for testing |
| `default` | 0.5 | 3000 | Balanced settings |

## 🛠️ Integration with AgentZero

AgentZero now uses the LLM helper for all LLM operations:

```javascript
// AgentZero automatically uses LLM helper
const agent = new AgentZero();

// Response includes provider info
const result = await agent.processMessage("Hello!", "session-123");
console.log(`Response from ${result.llmProvider} using ${result.model}`);
```

## 🔍 Troubleshooting

### LLM Configuration Issues
```bash
# Check LLM configuration
npm run test:llm

# Common issues:
# 1. Missing API key
# 2. Invalid endpoint URL
# 3. Wrong deployment name (Azure)
```

### Provider Detection
```javascript
const llmHelper = getLLMHelper();
const config = llmHelper.getConfigInfo();
console.log('Detected provider:', config.provider);
console.log('Configuration:', config);
```

### Validation Errors
```javascript
const validation = llmHelper.validateConfiguration();
if (!validation.valid) {
    console.log('Errors:', validation.errors);
    // Fix configuration based on error messages
}
```

### Agent Configuration Issues

#### **Configuration File Not Found**
```javascript
// Check if agent config exists
const config = llmHelper.getAgentConfig('YourAgent');
if (!config) {
    console.log('Agent config not found, using fallback prompts');
    // Create llm-config.json file for your agent
}
```

#### **Invalid JSON Structure**
```bash
# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('backend/agent/YourAgent/llm-config.json', 'utf8'))"

# Common issues:
# 1. Missing commas or quotes
# 2. Trailing commas
# 3. Invalid escape characters
```

#### **Missing Required Properties**
```javascript
// Check configuration validation
const llmHelper = getLLMHelper();
const config = llmHelper.loadAgentConfig('YourAgent');

// Look for validation errors in logs:
// [LLMHelper] Missing required property 'prompts' in config for agent: YourAgent
// [LLMHelper] Invalid agentInfo structure for agent: YourAgent
```

#### **Template Variable Issues**
```javascript
// Test template substitution
const result = llmHelper.substituteTemplateVariables(
    'Hello {userName}, your session is {sessionId}',
    { userName: 'Alice', sessionId: 'test123' }
);
console.log(result); // Should output: "Hello Alice, your session is test123"

// Common issues:
# 1. Misspelled variable names
# 2. Missing context values
# 3. Incorrect template syntax
```

#### **Property-Based Selection Not Working**
```javascript
// Debug prompt selection
const prompt = llmHelper.getSystemPrompt('AgentZero.analytical');
if (!prompt || prompt.length === 0) {
    console.log('Property-based selection failed, check:');
    console.log('1. Agent config file exists');
    console.log('2. system.analytical prompt is defined');
    console.log('3. JSON structure is valid');
}

// Test direct prompt access
const directPrompt = llmHelper.getAgentPrompt('AgentZero', 'system.analytical');
console.log('Direct access result:', directPrompt);
```

#### **Cache Issues**
```javascript
// Clear cache and reload
llmHelper.clearAgentConfigCache('YourAgent');
const freshConfig = llmHelper.loadAgentConfig('YourAgent');

// Or clear all agent caches
llmHelper.clearAgentConfigCache();
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Config file not found` | Missing llm-config.json | Create config file from template |
| `JSON parsing error` | Invalid JSON syntax | Validate JSON structure |
| `Missing required property` | Incomplete config | Add missing sections |
| `Prompt path not found` | Invalid dot notation | Check prompt structure |
| `Invalid config structure` | Schema validation failed | Follow template structure |

### Migration from Legacy Prompts

1. **Identify hardcoded prompts** in your agent code
2. **Create agent config file** using the template
3. **Move prompts** to appropriate sections
4. **Update agent code** to use property-based selection
5. **Test thoroughly** with different prompt variants

```javascript
// Before (legacy)
const prompt = "You are MyAgent, a helpful assistant...";

// After (config-based)
// In llm-config.json:
{
  "prompts": {
    "system": {
      "default": "You are MyAgent, a helpful assistant..."
    }
  }
}

// In agent code:
const prompt = this.llmHelper.getSystemPrompt('MyAgent');
```

## 📝 Agent Configuration System

The LLM helper now supports a powerful agent-specific configuration system that enables modular prompt management and property-based prompt selection.

### 🎯 **Agent Configuration Files**

Each agent can have its own `llm-config.json` file located at `backend/agent/{AgentName}/llm-config.json`:

```json
{
  "agentInfo": {
    "name": "AgentZero",
    "version": "1.0.0",
    "description": "Sophisticated AI assistant with persistent memory"
  },
  "prompts": {
    "system": {
      "default": "You are AgentZero, a sophisticated AI assistant...",
      "analytical": "You are AgentZero, specializing in analytical thinking...",
      "creative": "You are AgentZero, with enhanced creative capabilities...",
      "technical": "You are AgentZero, with deep technical expertise..."
    },
    "customInstructions": {
      "sessionContext": "Current session: {sessionId}",
      "fullContext": "Session: {sessionId} | Time: {timestamp} | Mode: {mode}"
    }
  },
  "templateVariables": {
    "sessionId": {"description": "Session identifier", "required": false},
    "timestamp": {"description": "Current timestamp", "required": false}
  }
}
```

### 🔧 **Property-Based Prompt Selection**

Access specific prompt variants using dot notation:

```javascript
const llmHelper = getLLMHelper();

// Legacy format (still supported)
const defaultPrompt = llmHelper.getSystemPrompt('AgentZero');

// Property-based selection
const analyticalPrompt = llmHelper.getSystemPrompt('AgentZero.analytical');
const creativePrompt = llmHelper.getSystemPrompt('AgentZero.creative');
const technicalPrompt = llmHelper.getSystemPrompt('AgentZero.technical');

// Direct prompt access
const customInstruction = llmHelper.getAgentPrompt('AgentZero', 'customInstructions.fullContext', {
    sessionId: 'user_123',
    timestamp: new Date().toISOString(),
    mode: 'analytical'
});
```

### 🎨 **Template Variable Substitution**

Prompts support dynamic template variables:

```javascript
const context = {
    sessionId: 'user_abc123',
    timestamp: '2025-01-14T10:30:00.000Z',
    mode: 'analytical',
    userInput: 'Analyze this data',
    userName: 'Alice'
};

// Template: "Hello {userName}, analyzing data in {mode} mode for session {sessionId}"
const prompt = llmHelper.getSystemPrompt('AgentZero.analytical', context);
```

### 📋 **Configuration Schema**

Agent configuration files follow this structure:

- **`agentInfo`**: Metadata about the agent
- **`prompts`**: All prompt variants and templates
  - **`system`**: System prompts for different modes
  - **`customInstructions`**: Context-aware instructions
  - **`userTemplates`**: User input formatting templates
  - **`errorMessages`**: Standardized error responses
- **`templateVariables`**: Variable definitions and validation
- **`behavior`**: Prompt selection and processing rules
- **`metadata`**: Schema version and compatibility info

### 🚀 **Creating New Agents**

1. **Copy the template**:
   ```bash
   cp backend/agent/agent-config-template.json backend/agent/YourAgent/llm-config.json
   ```

2. **Customize the configuration**:
   - Update `agentInfo` with your agent details
   - Define system prompts for different modes
   - Add custom template variables
   - Configure behavior rules

3. **Use in your agent**:
   ```javascript
   class YourAgent {
       constructor() {
           this.llmHelper = getLLMHelper();
       }
       
       async processMessage(userInput, sessionId) {
           const promptVariant = this.selectPromptVariant(userInput);
           const context = {
               sessionId,
               userInput,
               timestamp: new Date().toISOString()
           };
           
           const systemPrompt = this.llmHelper.getSystemPrompt(promptVariant, context);
           // ... rest of processing
       }
   }
   ```

### 🔍 **Configuration Loading and Caching**

The LLM helper automatically:
- **Loads** configuration files on first access
- **Caches** configurations for performance
- **Validates** configuration structure
- **Falls back** to hardcoded prompts if config is missing

```javascript
// Manual configuration management
const config = llmHelper.getAgentConfig('AgentZero');
llmHelper.clearAgentConfigCache('AgentZero'); // Force reload
```

### 🎯 **Intelligent Prompt Selection**

Agents can implement intelligent prompt selection based on user input:

```javascript
selectPromptVariant(userInput) {
    const input = userInput.toLowerCase();
    
    if (input.includes('analyze') || input.includes('data')) {
        return 'AgentZero.analytical';
    }
    if (input.includes('create') || input.includes('brainstorm')) {
        return 'AgentZero.creative';
    }
    if (input.includes('code') || input.includes('debug')) {
        return 'AgentZero.technical';
    }
    
    return 'AgentZero'; // Default
}
```

### 📊 **Legacy System Prompts**

For backward compatibility, these hardcoded prompts are still available:

- **`default`**: General helpful assistant
- **`agentZero`**: Sophisticated assistant with memory
- **`codeAssistant`**: Programming and technical help
- **`analyst`**: Data analysis and research

```javascript
// Legacy usage (still works)
const prompt = llmHelper.getSystemPrompt('codeAssistant', {
    customInstructions: 'Focus on Python and JavaScript'
});
```

## 🔐 Security Considerations

- **API Keys**: Never commit API keys to version control
- **Environment Separation**: Use different keys for dev/production
- **Validation**: Always validate configuration before use
- **Error Handling**: Don't expose API keys in error messages

## 🚀 Future Enhancements

The LLM helper is designed to be extensible:

- **Additional Providers**: Easy to add new LLM providers
- **Model Selection**: Dynamic model selection based on task
- **Cost Optimization**: Token usage tracking and optimization
- **Caching**: Response caching for repeated queries

## 🧠 Intelligent Classification with AgentRouter

### Overview

The LLM Helper system now supports intelligent prompt classification through **AgentRouter** - an advanced classification agent that uses LLM reasoning instead of simple keyword matching.

### Benefits of Intelligent Classification

- **30-50% Better Accuracy**: Compared to keyword-based selection
- **Context Awareness**: Understands user intent and conversation flow
- **Confidence Scoring**: Provides classification confidence levels
- **Reasoning Transparency**: Explains classification decisions
- **Graceful Fallback**: Automatically falls back to keyword matching on errors

### Basic Integration

```javascript
const { getLLMHelper } = require('./utils/llm-helper');
const AgentRouter = require('./agent/AgentRouter/agent');

class IntelligentAgent {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
        this.agentRouter = new AgentRouter();
        this.useIntelligentClassification = true;
    }

    async selectPromptVariant(userInput, context = {}) {
        if (this.useIntelligentClassification) {
            try {
                const result = await this.agentRouter.classifyPrompt(
                    userInput, 
                    this.constructor.name, 
                    context
                );
                
                console.log(`🧠 Intelligent: ${result.selectedVariant} (${result.confidence}%)`);
                return result.selectedVariant;
                
            } catch (error) {
                console.warn('⚠️ Falling back to keyword matching:', error.message);
                return this.selectPromptVariantKeyword(userInput);
            }
        }
        return this.selectPromptVariantKeyword(userInput);
    }

    // Keep keyword method as fallback
    selectPromptVariantKeyword(userInput) {
        const input = userInput.toLowerCase();
        if (input.includes('detailed')) return `${this.constructor.name}.detailed`;
        if (input.includes('quick')) return `${this.constructor.name}.quick`;
        return this.constructor.name;
    }
}
```

### Performance Comparison

| Method | Speed | Accuracy | Use Case |
|--------|-------|----------|----------|
| **Keyword** | ~0.01ms | 60-70% | High-speed, simple requirements |
| **AgentRouter** | ~2-5s | 85-95% | Context-aware, accurate classification |

### Configuration for AgentRouter

```javascript
// Enable intelligent classification globally
const llmHelper = getLLMHelper();

// AgentRouter uses the same LLM configuration
const agentRouter = new AgentRouter();

// Configure analysis modes
agentRouter.setAnalysisModeThresholds({
    quickModeWordLimit: 10,
    detailedModeComplexityThreshold: 0.8
});

// Enable caching for performance
agentRouter.enableCaching({
    maxCacheSize: 1000,
    cacheTTL: 3600000 // 1 hour
});
```

### Testing Intelligent Classification

```javascript
// Test classification accuracy
async function testIntelligentClassification() {
    const agent = new IntelligentAgent();
    
    const testCases = [
        {
            input: "I need comprehensive technical documentation",
            expected: "IntelligentAgent.technical",
            context: { userExpertise: "advanced" }
        },
        {
            input: "Quick overview please",
            expected: "IntelligentAgent.quick",
            context: { urgency: "high" }
        }
    ];
    
    for (const test of testCases) {
        const result = await agent.selectPromptVariant(test.input, test.context);
        console.log(`Input: "${test.input}"`);
        console.log(`Expected: ${test.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Match: ${result === test.expected ? '✅' : '❌'}`);
    }
}
```

### Migration from Keyword to Intelligent Classification

#### Phase 1: Add AgentRouter Support
```javascript
class ExistingAgent {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.agentRouter = new AgentRouter();
        this.useIntelligentClassification = false; // Start disabled
    }
    
    // Add intelligent classification method
    async selectPromptVariantIntelligent(userInput, context = {}) {
        const result = await this.agentRouter.classifyPrompt(
            userInput, 
            this.constructor.name, 
            context
        );
        return result.selectedVariant;
    }
}
```

#### Phase 2: Hybrid Approach
```javascript
async selectPromptVariant(userInput, context = {}) {
    if (this.useIntelligentClassification) {
        try {
            return await this.selectPromptVariantIntelligent(userInput, context);
        } catch (error) {
            console.warn('Falling back to keyword matching');
            return this.selectPromptVariantKeyword(userInput);
        }
    }
    return this.selectPromptVariantKeyword(userInput);
}
```

#### Phase 3: Enable by Default
```javascript
constructor() {
    this.useIntelligentClassification = true; // Enable by default
    // ... rest of constructor
}
```

### Troubleshooting Intelligent Classification

#### **Low Classification Confidence**
```javascript
// Add more context to improve accuracy
const result = await agentRouter.classifyPrompt(userInput, targetAgent, {
    userExpertise: 'advanced',
    taskComplexity: 'high',
    domainSpecific: true,
    conversationHistory: previousMessages
});

if (result.confidence < 70) {
    console.warn('Low confidence, consider fallback');
}
```

#### **Performance Issues**
```javascript
// Monitor classification performance
const metrics = agentRouter.getPerformanceMetrics();
console.log(`Average time: ${metrics.averageTime}ms`);
console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);

// Enable quick mode for simple inputs
if (userInput.split(' ').length < 5) {
    agentRouter.setAnalysisMode('quick');
}
```

For detailed AgentRouter documentation, see: `backend/agent/AgentRouter/README.md`

## 📚 Related Documentation

- **AgentRouter Documentation**: `backend/agent/AgentRouter/README.md`
- **Agent Integration Guide**: `backend/AGENT-INTEGRATION-GUIDE.md`
- **Prompt System Examples**: `backend/PROMPT-SYSTEM-EXAMPLES.md`
- **AgentZero Guide**: `backend/agent/AgentZero/README.md`
- **Test Documentation**: `backend/tests/README.md`
- **Environment Setup**: `backend/env-example.txt`
- **Project Standards**: `shrimp-rules.md` 