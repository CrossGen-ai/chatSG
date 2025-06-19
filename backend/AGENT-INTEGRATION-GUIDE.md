# Agent Integration Guide

## 🚀 Quick Start: Creating a New Agent

This guide walks you through creating a new agent using the ChatSG prompt configuration system.

### Step 1: Set Up Agent Directory Structure

```bash
# Create your agent directory
mkdir backend/agent/YourAgent

# Copy the configuration template
cp backend/agent/agent-config-template.json backend/agent/YourAgent/llm-config.json
```

### Step 2: Customize Agent Configuration

Edit `backend/agent/YourAgent/llm-config.json`:

```json
{
  "agentInfo": {
    "name": "DataAnalyst",
    "version": "1.0.0",
    "description": "Specialized AI agent for data analysis and insights",
    "author": "Your Team",
    "created": "2025-01-14",
    "lastModified": "2025-01-14",
    "tags": ["data", "analysis", "statistics"],
    "category": "analytical"
  },
  "prompts": {
    "system": {
      "default": "You are DataAnalyst, a specialized AI agent focused on data analysis. You excel at interpreting data, identifying patterns, and providing actionable insights.",
      "detailed": "You are DataAnalyst, operating in detailed analysis mode. Provide comprehensive statistical analysis with explanations of methodology and confidence levels.",
      "quick": "You are DataAnalyst in quick analysis mode. Provide concise, focused insights with key findings highlighted.",
      "exploratory": "You are DataAnalyst in exploratory mode. Help users discover patterns and ask probing questions about their data."
    },
    "customInstructions": {
      "datasetContext": "Analyzing dataset: {datasetName} with {recordCount} records",
      "analysisContext": "Analysis type: {analysisType} | Confidence level: {confidenceLevel}",
      "userContext": "User expertise level: {expertiseLevel}"
    }
  },
  "templateVariables": {
    "datasetName": {
      "description": "Name of the dataset being analyzed",
      "example": "sales_data_2024.csv",
      "required": false,
      "default": "current dataset"
    },
    "recordCount": {
      "description": "Number of records in the dataset",
      "example": "10,000",
      "required": false,
      "default": "unknown"
    },
    "analysisType": {
      "description": "Type of analysis being performed",
      "example": "regression, clustering, descriptive",
      "required": false,
      "default": "general"
    },
    "expertiseLevel": {
      "description": "User's data analysis expertise",
      "example": "beginner, intermediate, advanced",
      "required": false,
      "default": "intermediate"
    }
  }
}
```

### Step 3: Create Agent Class

Create `backend/agent/YourAgent/agent.js`:

```javascript
const { getLLMHelper } = require('../../utils/llm-helper');

class DataAnalyst {
    constructor() {
        this.llmHelper = getLLMHelper();
        this.llm = this.llmHelper.createChatLLM();
    }

    selectPromptVariant(userInput, analysisType = 'general') {
        const input = userInput.toLowerCase();
        
        if (input.includes('detailed') || input.includes('comprehensive')) {
            return 'DataAnalyst.detailed';
        }
        if (input.includes('quick') || input.includes('summary')) {
            return 'DataAnalyst.quick';
        }
        if (input.includes('explore') || input.includes('discover')) {
            return 'DataAnalyst.exploratory';
        }
        
        return 'DataAnalyst';
    }

    async analyzeData(userInput, context = {}) {
        try {
            const promptVariant = this.selectPromptVariant(userInput, context.analysisType);
            const enhancedContext = {
                sessionId: context.sessionId || 'analysis_' + Date.now(),
                timestamp: new Date().toISOString(),
                userInput: userInput,
                datasetName: context.datasetName || 'current dataset',
                recordCount: context.recordCount || 'unknown',
                analysisType: context.analysisType || 'general',
                expertiseLevel: context.expertiseLevel || 'intermediate',
                ...context
            };
            
            const systemPrompt = this.llmHelper.getSystemPrompt(promptVariant, enhancedContext);
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userInput }
            ];
            
            const response = await this.llm.invoke(messages);
            
            return {
                success: true,
                analysis: response.content,
                promptVariant: promptVariant,
                context: enhancedContext,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                analysis: 'I apologize, but I encountered an error during analysis.',
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = DataAnalyst;
```

## 🎯 Advanced Features

### Custom Template Variables

Add domain-specific variables to your configuration:

```json
{
  "templateVariables": {
    "modelType": {
      "description": "Type of ML model being used",
      "example": "linear_regression, random_forest, neural_network",
      "required": false,
      "default": "not specified"
    }
  }
}
```

### Behavior Configuration

Control how your agent selects and processes prompts:

```json
{
  "behavior": {
    "promptSelection": {
      "enabled": true,
      "strategy": "keyword-based",
      "fallbackToDefault": true,
      "keywords": {
        "detailed": ["detailed", "comprehensive", "thorough"],
        "quick": ["quick", "brief", "summary", "overview"]
      }
    }
  }
}
```

## 🧪 Testing Your Agent

Create `backend/test-your-agent.js`:

```javascript
const DataAnalyst = require('./agent/YourAgent/agent.js');

async function testDataAnalyst() {
    const analyst = new DataAnalyst();
    
    const tests = [
        {
            input: "Give me a quick overview of this sales data",
            context: { datasetName: "sales_2024.csv", recordCount: "5,000" }
        },
        {
            input: "I need a detailed statistical analysis",
            context: { analysisType: "regression", expertiseLevel: "advanced" }
        }
    ];
    
    for (const test of tests) {
        console.log(`Testing: "${test.input}"`);
        const result = await analyst.analyzeData(test.input, test.context);
        console.log(`Success: ${result.success}`);
        console.log(`Variant: ${result.promptVariant}`);
    }
}

testDataAnalyst();
```

## 📚 Best Practices

1. **Keep prompts focused**: Each variant should have a clear purpose
2. **Use descriptive names**: Make prompt variants self-explanatory
3. **Test thoroughly**: Verify all prompt variants work as expected
4. **Document your variables**: Provide clear descriptions and examples
5. **Handle errors gracefully**: Implement fallback mechanisms
6. **Monitor performance**: Track prompt selection and response quality

## 🧠 Intelligent Prompt Classification with AgentRouter

### Overview

Instead of simple keyword-based prompt selection, you can use **AgentRouter** for intelligent LLM-powered classification that provides 30-50% better accuracy through context-aware analysis.

### Quick Integration

```javascript
const AgentRouter = require('../AgentRouter/agent');

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
                return result.selectedVariant;
            } catch (error) {
                console.warn('Falling back to keyword matching:', error.message);
                return this.selectPromptVariantKeyword(userInput);
            }
        }
        return this.selectPromptVariantKeyword(userInput);
    }

    // Keep keyword method as fallback
    selectPromptVariantKeyword(userInput) {
        const input = userInput.toLowerCase();
        if (input.includes('detailed')) return 'YourAgent.detailed';
        if (input.includes('quick')) return 'YourAgent.quick';
        return 'YourAgent';
    }

    // Toggle intelligent classification at runtime
    setIntelligentClassification(enabled) {
        this.useIntelligentClassification = enabled;
        console.log(`Intelligent classification ${enabled ? 'enabled' : 'disabled'}`);
    }
}
```

### Benefits of Intelligent Classification

- **Context Awareness**: Understands user intent beyond keywords
- **Confidence Scoring**: Provides classification confidence levels
- **Reasoning Transparency**: Explains classification decisions
- **Graceful Fallback**: Automatically falls back to keyword matching on errors
- **Performance Monitoring**: Tracks classification accuracy and performance

### Migration Strategy

1. **Phase 1**: Add AgentRouter as optional feature with keyword fallback
2. **Phase 2**: Test and compare classification results
3. **Phase 3**: Enable intelligent classification by default
4. **Phase 4**: Remove keyword fallback once confidence is high

```javascript
// Test classification comparison
async testClassificationComparison(userInput, context = {}) {
    const keywordResult = this.selectPromptVariantKeyword(userInput);
    const intelligentResult = await this.agentRouter.classifyPrompt(
        userInput, 
        this.constructor.name, 
        context
    );
    
    return {
        keyword: keywordResult,
        intelligent: intelligentResult.selectedVariant,
        confidence: intelligentResult.confidence,
        match: keywordResult === intelligentResult.selectedVariant
    };
}
```

For detailed AgentRouter documentation, see: `backend/agent/AgentRouter/README.md`

## 🔗 Related Resources

- **LLM Helper Guide**: `backend/LLM-HELPER-GUIDE.md`
- **AgentRouter Documentation**: `backend/agent/AgentRouter/README.md`
- **Prompt System Examples**: `backend/PROMPT-SYSTEM-EXAMPLES.md`
- **Agent Template**: `backend/agent/agent-config-template.json`
- **AgentZero Example**: `backend/agent/AgentZero/` 