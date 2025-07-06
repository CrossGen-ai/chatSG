# CRM Agent

The CRM Agent is a specialized individual agent designed for Customer Relationship Management (CRM) operations, providing intelligent customer queries, contact searches, pipeline analysis, and opportunity tracking through deep integration with Insightly CRM.

## Overview

The CRM Agent leverages advanced LLM-driven workflows to understand user intent and orchestrate complex CRM operations. Unlike traditional pattern-matching approaches, this agent uses Large Language Models for query understanding, tool orchestration, and result formatting, providing a more flexible and intelligent CRM interaction experience.

## Architecture

### Core Components

```
CRMAgent (Main Agent Class)
├── Workflow System (LangGraph-based)
│   ├── Intake Node - Process user input
│   ├── LLM Understanding Node - Analyze query intent
│   ├── Tool Orchestration Node - Plan and execute API calls
│   └── Result Processing Node - Format final response
├── CRM Tools
│   ├── InsightlyApiTool - Core API client
│   ├── ContactManagerTool - Contact operations
│   └── OpportunityTool - Pipeline and deals
└── Workflow Helper
    ├── Query Analysis (LLM-driven)
    ├── Tool Orchestration Planning
    └── Result Formatting
```

### LLM-Driven Workflow

The agent implements a **purely LLM-driven approach** with no fallback to pattern matching:

1. **Query Understanding**: LLM analyzes user input to extract intent, entities, and search strategy
2. **Tool Orchestration**: LLM creates execution plans for API calls based on understanding
3. **Result Processing**: LLM formats responses contextually based on query type and results

**No Silent Fallbacks**: The agent fails immediately with clear error messages when LLM components fail, ensuring transparent debugging.

## Features

### Supported Operations

- **Customer Lookup**: Find contacts by name, email, company, or ID
- **Contact Search**: Intelligent search with multiple fallback strategies
- **Pipeline Analysis**: Sales funnel analysis and conversion tracking
- **Opportunity Tracking**: Deal management and opportunity insights
- **Lead Management**: Lead scoring and qualification
- **Sales Forecasting**: Pipeline value and probability analysis
- **Data Enrichment**: Contact scoring and relationship insights

### Query Types Supported

- **Detailed Queries**: "Give me the full details of Peter Kelly"
- **Search Queries**: "Find contacts at Microsoft"
- **Pipeline Queries**: "Show me pipeline status for Q4"
- **Opportunity Queries**: "What deals are close to closing?"
- **General Queries**: "CRM summary for this month"

## Agent Capabilities

```typescript
{
  name: 'CRMAgent',
  version: '1.0.0',
  supportedModes: ['chat', 'query'],
  features: [
    'customer-lookup',
    'contact-search',
    'pipeline-analysis', 
    'opportunity-tracking',
    'lead-management',
    'sales-forecasting',
    'data-enrichment'
  ],
  inputTypes: ['text'],
  outputTypes: ['text', 'structured-data'],
  maxSessionMemory: 50,
  supportsTools: true,
  supportsStateSharing: true
}
```

## Workflow State Management

### CRMWorkflowState Structure

```typescript
interface CRMWorkflowState {
  messages: Array<HumanMessage | AIMessage | SystemMessage>;
  sessionId: string;
  currentStage: 'intake' | 'llm_understanding' | 'tool_orchestration' | 'result_processing' | 'complete';
  queryUnderstanding?: {
    userIntent: string;
    extractedInfo: {
      names?: string[];
      emails?: string[];
      companies?: string[];
      identifiers?: string[];
    };
    searchStrategy: {
      primaryApproach: string;
      fallbackApproaches: string[];
      needsDetailedView: boolean;
    };
    confidence: number;
  };
  toolOrchestrationPlan?: {
    toolSequence: Array<{
      toolName: string;
      parameters: any;
      reason: string;
    }>;
    expectedOutcome: string;
  };
  retrievedData?: any;
  toolsUsed: string[];
  errors: string[];
  confidenceScore: number;
  processingTime?: number;
  response?: string;
  responseMetadata?: any;
}
```

## Integration with Orchestrator

### Slash Command Support

The CRM Agent supports forced routing via slash commands:

- `/crm` - Force route to CRM Agent
- `/customer` - Alias for CRM Agent
- `/sales` - Alias for CRM Agent

### Fallback Notification

When slash command routing fails (e.g., agent fails to initialize), the system provides clear user notifications:

```
⚠️ The /crm command isn't working (agent failed to load). I'll route your message to another agent instead.
```

### Agent Selection Scoring

The orchestrator uses these criteria for CRM Agent selection:

- **Keywords**: customer, crm, contact, sales, pipeline, opportunity, lead
- **Intent Patterns**: lookup queries, search requests, pipeline analysis
- **Context**: Previous CRM interactions in session
- **Confidence Threshold**: 0.7+ for automatic selection

## Configuration

### Required Environment Variables

```bash
# CRM API Configuration
INSIGHTLY_API_KEY=your_insightly_api_key
INSIGHTLY_API_URL=https://api.insightly.com/v3.1  # Optional, defaults to NA region

# LLM Configuration (for agent functionality)
OPENAI_API_KEY=your_openai_key  # OR
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
```

### Optional Configuration

```bash
# CRM Tool Configuration
CRM_MAX_PAGE_SIZE=50  # Default: 50
CRM_REQUEST_TIMEOUT=10000  # Default: 10 seconds
CRM_RATE_LIMIT_MAX_REQUESTS=10  # Default: 10
CRM_RATE_LIMIT_WINDOW_MS=1000  # Default: 1 second
```

## Error Handling

### LLM Dependency

The CRM Agent **requires functional LLM** for operation. It does not provide fallback functionality:

- **Query Understanding Failure**: Throws `CRM Agent LLM understanding failed`
- **Tool Orchestration Failure**: Throws `LLM tool orchestration failed`  
- **Result Formatting Failure**: Throws `LLM result formatting failed`

### API Error Handling

- **401/403**: Authentication/permission errors with clear messaging
- **429**: Rate limiting with automatic retry delays
- **404**: Resource not found with helpful suggestions
- **500+**: Server errors with diagnostic information

### Validation

- **API Compliance**: Built-in validation for Insightly API requirements
- **Parameter Validation**: Tool parameter validation with error details
- **Configuration Validation**: Environment variable and setup validation

## Testing

### Unit Testing

```bash
# Test agent compilation and structure
node tests/integration/test-crm-syntax.js

# Test with mocked dependencies
node tests/integration/test-crm-refactored.js
```

### Integration Testing

```bash
# Test with real API (requires API keys)
node tests/integration/test-crm-integration.js

# Test slash command routing
node tests/integration/test-crm-slash-command.js
```

### Manual Testing

```bash
# Via orchestrator
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "find contact peter kelly", "sessionId": "test"}'

# Via slash command
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "/crm give me full details of peter kelly", "sessionId": "test"}'
```

## Performance Considerations

### Memory Management

- **Session Memory**: Limited to 50 messages per session
- **State Persistence**: Workflow state persists across conversation turns
- **Tool Caching**: Contact and opportunity data cached for 5 minutes
- **LLM Context**: Optimized prompts to minimize token usage

### Rate Limiting

- **API Requests**: 10 requests per second to Insightly
- **Request Queuing**: Automatic queuing with rate limit compliance
- **Timeout Handling**: 10-second timeout for API calls
- **Retry Logic**: Automatic retry with exponential backoff

### Scalability

- **Stateless Operation**: Each message processing is independent
- **Concurrent Sessions**: Supports multiple simultaneous sessions
- **Resource Cleanup**: Automatic cleanup of connections and resources
- **Performance Monitoring**: Built-in execution time tracking

## Debugging

### Logging

The agent provides detailed logging at each workflow stage:

```
[CRMAgent] Initializing...
[CRMAgent] Intake node processing...
[CRMAgent] LLM Understanding node processing...
[CRMAgent] Tool Orchestration node processing...
[CRMAgent] Executing searchContacts: {parameters}
[CRMAgent] Result Processing node processing...
```

### Common Issues

1. **"CRM Agent LLM understanding failed"**
   - **Cause**: LLM API keys missing or invalid
   - **Solution**: Configure OPENAI_API_KEY or Azure credentials

2. **"INSIGHTLY_API_KEY environment variable is required"**
   - **Cause**: Insightly API key not configured
   - **Solution**: Set INSIGHTLY_API_KEY in environment

3. **"Agent not found for type: crm"**
   - **Cause**: Agent failed to initialize or compile
   - **Solution**: Check logs for initialization errors

4. **Empty search results**
   - **Cause**: API credentials incorrect or no matching data
   - **Solution**: Verify API key permissions and test data

### Debug Mode

Enable debug mode for detailed workflow tracing:

```bash
export DEBUG=crm:*
npm start
```

## API Reference

See [CRM API Reference](../../../docs/crm-api-reference.md) for detailed API documentation.

## Related Documentation

- [CRM Integration Overview](../../../../docs/crm-integration.md)
- [CRM Slash Commands](../../../../docs/crm-slash-command.md)
- [CRM Usage Examples](../../../../docs/crm-usage-examples.md)
- [CRM Tools README](../../tools/crm/README.md)

## Contributing

When contributing to the CRM Agent:

1. **Follow LLM-first approach**: No pattern matching fallbacks
2. **Maintain API compliance**: Use validation helpers
3. **Add comprehensive tests**: Unit and integration coverage
4. **Update documentation**: Keep this README current
5. **Error transparency**: Clear error messages, no silent failures

## License

Part of the ChatSG project. See main project license for details.