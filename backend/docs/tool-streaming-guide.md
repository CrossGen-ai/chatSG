# Tool Streaming Guide

This guide explains how to implement and use real-time tool status streaming in ChatSG.

## Overview

The tool streaming feature provides real-time visibility into tool execution with inline results display:
- When tools start executing
- Progress updates during execution
- **Formatted results displayed inline within tool messages**
- Errors if tools fail
- **Unified tool-response messages prevent duplicate content**

## Architecture

### 1. Base Tool Class Enhancement

All tools extending `BaseTool` automatically get streaming capabilities through these protected methods:

```typescript
// Send tool start event
protected sendToolStart(parameters: any, context?: ToolContext): string

// Send progress updates
protected sendToolProgress(progress: string, metadata?: any, context?: ToolContext): void

// Send tool result
protected sendToolResult(result: any, context?: ToolContext): void

// Send tool error
protected sendToolError(error: string, context?: ToolContext): void
```

### 2. Tool Implementation

Tools can use these methods within their `execute` method:

```typescript
async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
  try {
    // Send start event
    this.sendToolStart(params, context);
    
    // Send progress updates
    this.sendToolProgress('Connecting to API...', { step: 1 }, context);
    
    // Do work...
    const result = await this.performOperation();
    
    // Send result
    this.sendToolResult(result, context);
    
    return this.createSuccessResult(result);
  } catch (error) {
    // Send error
    this.sendToolError(error.message, context);
    return this.createErrorResult(error.message);
  }
}
```

### 3. Agent Integration

Agents pass the streaming callback through the tool context:

```typescript
// In your agent's processMessage method
async processMessage(input: string, sessionId: string, streamCallback?: StreamingCallback) {
  // Create tool context with streaming callback
  const toolContext: ToolContext = {
    sessionId,
    agentName: this.name,
    streamCallback  // Pass the callback through
  };
  
  // Execute tool with context
  const result = await this.myTool.execute(params, toolContext);
}
```

### 4. Backend Streaming

The server.js file handles the SSE events:

```javascript
const streamCallback = (token) => {
  if (typeof token === 'object' && token.type === 'status') {
    // Tool-specific events
    if (token.statusType === 'tool_start') {
      sendEvent('tool_start', { /* tool data */ });
    } else if (token.statusType === 'tool_progress') {
      sendEvent('tool_progress', { /* progress data */ });
    }
    // ... other tool events
  }
};
```

### 5. Frontend Display

The frontend receives these events and displays them inline with chat messages:

```typescript
// In ChatUI component
onToolStart: (data) => {
  // Creates a tool message in the chat stream
  const toolMessage = {
    sender: 'tool',
    toolExecution: {
      id: data.toolId,
      toolName: data.toolName,
      status: 'starting',
      parameters: data.parameters
    }
  };
  addMessage(toolMessage);
},
onToolResult: (data) => {
  // Formats results for display
  const responseContent = formatToolResponse(data.result);
  updateToolMessage(data.toolId, {
    status: 'completed',
    result: data.result,
    responseContent  // Formatted markdown for display
  });
}
```

### 6. Unified Tool-Response Messages

Tool results can be displayed directly in the tool message, preventing duplicate bot responses:

```typescript
// Tool message with inline results
{
  sender: 'tool',
  toolExecution: {
    toolName: 'ContactManagerTool',
    status: 'completed',
    responseContent: `Found **Peter Kelly**
    - Email: peter.kelly@nzdf.mil.nz
    - Lead Score: 100/100
    - Opportunities: 50
    - Total Value: $5,521,492.46`
  }
}
```

## Benefits

1. **Transparency**: Users see what tools agents are using
2. **Progress Tracking**: Long-running tools can show progress
3. **Debugging**: Developers can see tool parameters and results
4. **Trust**: Users understand the AI's process
5. **Clean UI**: Tool results appear inline, preventing duplicate messages
6. **Better UX**: Expandable tool messages keep the chat concise

## Example Tools

- `DataAnalysisTool`: Shows multi-step analysis with progress updates
- `ContactManagerTool`: Displays formatted contact information with lead scores and opportunities
- `WebSearchTool`: Can show search query and result processing
- `InsightlyAPITool`: Raw API access with request/response visibility

## Best Practices

1. **Always use context**: Pass the tool context to enable streaming
2. **Meaningful progress**: Send progress updates for operations > 1 second
3. **Error handling**: Always send error events on failure
4. **Avoid spam**: Don't send too many progress updates (throttle if needed)
5. **Privacy**: Be careful about what parameters you expose in the UI

## Migration Guide

For existing tools:

1. No changes required - streaming is opt-in
2. To add streaming, use the `sendTool*` methods in your execute method
3. Ensure agents pass streamCallback through tool context
4. Tools will automatically stream if context includes callback

## Testing

To test tool streaming:

1. Use a tool that implements streaming (e.g., DataAnalysisTool)
2. Watch the browser console for tool events
3. Verify the ToolStatusWidget shows tool activity
4. Check that results appear after completion