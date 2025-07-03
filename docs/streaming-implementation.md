# Streaming Implementation Guide for ChatSG

## Overview

This document describes the streaming functionality implemented in ChatSG, which allows real-time token-by-token display of AI responses instead of waiting for the complete response.

## Architecture

### Backend Components

#### 1. SSE Endpoint (`/api/chat/stream`)
- Located in `backend/server.js`
- Implements Server-Sent Events (SSE) for real-time streaming
- Handles agent selection and routing with streaming support

#### 2. LLM Provider Integration
- Updated `backend/utils/llm-helper.js` to support streaming mode
- Adds `streaming: true` option to ChatOpenAI configuration
- Works with both OpenAI and Azure OpenAI providers

#### 3. Agent Architecture Updates
- Modified `BaseAgent` interface to accept optional `StreamingCallback`
- Updated specialized agents (AnalyticalAgent, CreativeAgent, TechnicalAgent) to support streaming
- Fallback to simulated streaming for agents without native support

### Frontend Components

#### 1. Streaming API Client
- New `sendChatMessageStream()` function in `frontend/src/api/chat.ts`
- Implements proper SSE parsing with fetch API
- Handles connection lifecycle and error management

#### 2. UI Updates
- Modified `ChatUI.tsx` to support streaming display
- Added state management for partial messages
- Real-time token rendering with proper React state updates

## Implementation Details

### Backend Streaming Flow

1. **Request Reception**
   ```javascript
   // Client sends POST to /api/chat/stream
   {
     message: "User's question",
     sessionId: "session-id",
     activeSessionId: "current-active-session"
   }
   ```

2. **SSE Headers**
   ```javascript
   res.writeHead(200, {
     'Content-Type': 'text/event-stream',
     'Cache-Control': 'no-cache',
     'Connection': 'keep-alive',
     'Access-Control-Allow-Origin': '*',
     'X-Accel-Buffering': 'no'
   });
   ```

3. **Event Types**
   - `connected`: Initial connection established
   - `start`: Streaming begins, includes agent info
   - `token`: Individual token/chunk of response
   - `done`: Streaming completed
   - `error`: Error occurred during streaming

### Frontend Streaming Flow

1. **Initiate Stream**
   ```typescript
   const controller = sendChatMessageStream(message, sessionId, {
     callbacks: {
       onStart: (data) => { /* Handle start */ },
       onToken: (token) => { /* Handle token */ },
       onDone: (data) => { /* Handle completion */ },
       onError: (error) => { /* Handle error */ }
     }
   });
   ```

2. **Display Updates**
   - Create placeholder message immediately
   - Update message content as tokens arrive
   - Finalize message on completion

### Agent Streaming Support

Agents can implement streaming by checking for the callback:

```typescript
async processMessage(
  input: string, 
  sessionId: string, 
  streamCallback?: StreamingCallback
): Promise<AgentResponse> {
  if (streamCallback) {
    // Use streaming LLM
    const stream = await streamingLLM.stream(messages);
    for await (const chunk of stream) {
      streamCallback(chunk.content);
    }
  } else {
    // Use regular LLM
    const response = await llm.invoke(messages);
  }
}
```

## Testing

### Manual Testing

1. Start the backend server
2. Run the test script:
   ```bash
   cd backend/tests
   node test-streaming.js
   ```

3. Or use the frontend UI and observe real-time token display

### Expected Behavior

1. User sends message
2. Loading indicator briefly appears
3. Response starts appearing token by token
4. Agent avatar and name displayed
5. Message saved to storage after completion

## Configuration

### Enable/Disable Streaming

Currently, streaming is enabled by default. To disable:

1. In `ChatUI.tsx`, replace `sendMessageWithStreaming` with `sendMessage`
2. Or add a user preference toggle

### Streaming Speed

Adjust token delay in `server.js` for simulated streaming:
```javascript
await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
```

## Performance Considerations

1. **Network**: SSE maintains persistent connection
2. **Memory**: Accumulates tokens in memory during streaming
3. **Storage**: Only saves complete message after streaming finishes

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11.3+)
- IE: Not supported (use fallback)

## Error Handling

1. **Connection Errors**: Automatic fallback to non-streaming
2. **Stream Interruption**: Save partial message with error state
3. **Agent Errors**: Display error message in UI

## Future Enhancements

1. **Chunked Responses**: Stream larger chunks for better performance
2. **Markdown Rendering**: Progressive markdown parsing
3. **Code Highlighting**: Real-time syntax highlighting
4. **Abort Support**: Allow users to stop generation mid-stream
5. **Retry Logic**: Automatic reconnection on network issues