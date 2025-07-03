# Streaming Troubleshooting Guide

## Common Issues and Solutions

### 1. Messages Not Appearing

**Symptoms**: Loading dots appear then disappear with no message

**Causes & Solutions**:
- **Browser cache**: Hard refresh (Cmd+Shift+R)
- **React HMR issues**: Restart frontend server
- **Network timeout**: Check browser console for errors
- **Mem0 delay**: Wait 2-3 seconds for initial response

### 2. Post-Streaming Delay

**Symptoms**: UI freezes for several seconds after streaming completes

**Solution**: Already fixed by making Mem0 saves asynchronous
```javascript
// In server.js - storage operations run after sending 'done'
setImmediate(async () => {
  await storageManager.saveMessage(...);
});
```

### 3. Message Flicker/Re-render

**Symptoms**: Chat bubble disappears and reappears after streaming

**Solution**: Already fixed by updating content during streaming
```javascript
// In ChatUI.tsx - update message content during onToken
setMessages(msgs => msgs.map(msg => 
  msg.id === botMessageId ? { ...msg, content: currentContent } : msg
));
```

### 4. Duplicate Messages

**Symptoms**: Same message appears twice

**Causes & Solutions**:
- **Background sync**: Check if message is being synced from cache
- **Double save**: Ensure message is only saved once
- **State issue**: Check React strict mode isn't causing double renders

### 5. Streaming Not Working

**Symptoms**: Full message appears at once instead of streaming

**Debugging Steps**:
1. Check backend logs for streaming callbacks
2. Verify SSE headers are correct
3. Test with `backend/tests/test-streaming.js`
4. Check if agent supports streaming (has streamCallback parameter)

## Performance Testing

### Test Streaming Delays
```bash
cd backend/tests
node trace-delays.js
```

Expected timings:
- Initial delay: 2-4 seconds (agent selection + Mem0)
- First token: < 500ms after "start" event
- Post-stream delay: < 100ms

### Test Without Mem0
```bash
MEM0_ENABLED=false node server.js
# In another terminal
node trace-delays.js
```

### Monitor Real-time Performance
```bash
# Watch backend logs
tmux attach -t chatsg-backend

# Check for these key messages:
# [Server] Sending SSE event: token
# [Server] Async storage save completed
# [BaseAgent] Mem0 context retrieval timed out after 2s
```

## Debug Mode

Add temporary debug panel to ChatUI:
```jsx
{process.env.NODE_ENV === 'development' && isStreaming && (
  <DebugPanel 
    tokens={debugStreamData.tokens}
    events={debugStreamData.events}
    raw={debugStreamData.raw}
  />
)}
```

## Quick Fixes

### Disable Mem0 Temporarily
```bash
# In backend/.env
MEM0_ENABLED=false
```

### Increase Mem0 Timeout
```typescript
// In BaseAgent.ts
setTimeout(() => resolve(minimalContext), 5000); // 5s instead of 2s
```

### Force Non-Streaming Mode
```typescript
// In ChatUI.tsx
// Replace: onClick={sendMessageWithStreaming}
// With: onClick={sendMessage}
```

## Server-Sent Events Checklist

✅ Correct headers:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `X-Accel-Buffering: no` (for nginx)

✅ Event format:
```
event: token
data: {"content": "Hello"}

```
(Note the double newline after data)

✅ Keep-alive:
- Send periodic comments or heartbeat events
- Handle reconnection on client side

## Tab Switching During Streaming (Working Correctly)

**Current Behavior**: 
- Streaming continues in background when switching tabs ✅
- Content is preserved and displayed when returning ✅
- Multiple concurrent streams are supported ✅
- Loading indicators show in sidebar for background streams ✅

**Note**: This functionality is critical and must be preserved in future updates.
See `docs/streaming-state-management.md` for implementation details.

## Logging for Debugging

Enable detailed logging:
```javascript
// In server.js
console.log('[STREAMING] Event:', eventType, 'Data:', data);

// In ChatUI.tsx
console.log('[UI] Streaming state:', {
  isStreaming,
  messageId: streamingMessageId,
  contentLength: streamingMessage.length
});

// For tab switching issues
console.log('[ChatUI] Saving streaming state for session', sessionId);
console.log('[ChatUI] Restoring streaming state for session', sessionId);
```