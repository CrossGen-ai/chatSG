# Frontend Architecture Documentation

## Overview

The ChatSG frontend is a modern React 18 + TypeScript application featuring real-time streaming, inline tool status displays, and a glassmorphism UI design.

## Key Features

### 1. Real-Time Tool Status Streaming

The frontend displays tool execution status inline with chat messages:

- **Tool Messages**: Special message type (`sender: 'tool'`) for tool execution
- **Expandable UI**: Collapsible tool status messages with detailed information
- **Formatted Results**: Tool outputs displayed as formatted markdown
- **Unified Messages**: Tool results appear inline, preventing duplicate bot responses

#### Tool Message Structure
```typescript
interface HybridMessage {
  sender: 'user' | 'bot' | 'tool';
  toolExecution?: {
    id: string;
    toolName: string;
    status: 'starting' | 'running' | 'completed' | 'error';
    parameters?: any;
    result?: any;
    responseContent?: string;  // Formatted markdown response
    isExpanded?: boolean;
    // ... timing and metadata
  };
}
```

### 2. Components

#### Core Components

- **`ChatUI.tsx`**: Main chat interface with SSE streaming support
  - Handles tool status events (`tool_start`, `tool_progress`, `tool_result`, `tool_error`)
  - Formats tool results for display
  - Manages unified tool-response messages

- **`ToolStatusMessage.tsx`**: Inline tool execution display
  - Collapsible interface showing tool name and status
  - Displays formatted results when expanded
  - Shows parameters, results, errors, and timing

- **`MessageItem.tsx`**: Renders individual chat messages
  - Supports user, bot, and tool message types
  - Markdown rendering with XSS protection
  - Agent-specific avatars and styling

#### Supporting Components

- **`SlashCommandInput.tsx`**: Command palette for agent routing
- **`ChatSidebar.tsx`**: Session management and navigation
- **`MarkdownRenderer.tsx`**: Safe markdown rendering with DOMPurify

### 3. Hooks

- **`useChatManager.tsx`**: Centralized chat state management
  - Message persistence and synchronization
  - Session lifecycle management
  - Tool message support

- **`useToolStatus.tsx`**: Tool execution state management
  - Tracks active and completed tools
  - Manages expansion state
  - (Note: Currently replaced by inline tool messages)

### 4. Real-Time Streaming

#### SSE Event Handling
```typescript
// Tool-specific event handlers in ChatUI
onToolStart: (data) => {
  // Creates tool message in chat stream
  const toolMessage: HybridMessage = {
    sender: 'tool',
    toolExecution: {
      id: data.toolId,
      toolName: data.toolName,
      status: 'starting',
      parameters: data.parameters
    }
  };
  setMessages(prev => [...prev, toolMessage]);
},

onToolResult: (data) => {
  // Formats and displays results
  const responseContent = formatToolResponse(data.result);
  updateToolMessage(data.toolId, {
    status: 'completed',
    result: data.result,
    responseContent
  });
}
```

#### Result Formatting
Tool results are automatically formatted based on content type:
- **CRM Contacts**: Formatted with name, email, lead score, opportunities
- **Lists**: Numbered lists with key information
- **Errors**: Clear error messages
- **Generic**: JSON formatting for other data types

### 5. UI/UX Features

- **Glassmorphism Design**: Modern frosted glass effects
- **Dark Mode Support**: Full dark mode with proper contrast
- **Responsive Layout**: Mobile-friendly responsive design
- **Smooth Animations**: Transitions for tool status changes
- **Auto-scroll**: Smart scrolling that respects user intent

### 6. Security

- **XSS Prevention**: DOMPurify for markdown content
- **CSRF Protection**: Header-based tokens for API calls
- **Input Validation**: Message length and content validation
- **Secure WebSockets**: WSS for production environments

## File Structure

```
frontend/src/
├── components/
│   ├── ChatUI.tsx              # Main chat interface
│   ├── ToolStatusMessage.tsx   # Tool execution display
│   ├── MessageItem.tsx         # Message rendering
│   ├── MarkdownRenderer.tsx    # Safe markdown display
│   └── ...
├── hooks/
│   ├── useChatManager.tsx      # Chat state management
│   ├── useToolStatus.tsx       # Tool state (legacy)
│   └── ...
├── api/
│   └── chat.ts                 # API client with SSE
└── services/
    └── AgentAvatarService.ts   # Agent theming
```

## Best Practices

1. **Tool Message Management**
   - Always update existing tool messages rather than creating new ones
   - Use `responseContent` for formatted display content
   - Preserve raw `result` data for debugging

2. **Performance**
   - Tool messages update in place to avoid re-renders
   - Batch state updates during streaming
   - Use React.memo for expensive components

3. **User Experience**
   - Keep tool messages collapsed by default
   - Show concise status text when collapsed
   - Format results for readability

4. **Error Handling**
   - Display tool errors inline with clear messages
   - Preserve error state in tool messages
   - Allow retry through new messages

## Future Enhancements

- Animation transitions for tool status changes
- Rich media support in tool results
- Tool result caching for offline access
- Advanced filtering for tool messages