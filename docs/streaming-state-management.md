# Streaming State Management for Tab Switching

## Overview
This document describes how ChatSG handles streaming messages when users switch between chat tabs. The implementation allows messages to continue streaming in the background while preserving content and allowing users to switch freely between chats.

## Historical Context (Previous Issues - Now Resolved)
Previously, when a user switched tabs while a message was streaming:
1. The loading spinner would persist indefinitely
2. Streaming content would be lost
3. Messages would show only three dots with no content
4. The streaming would be aborted

**These issues have been completely resolved with the current implementation.**

## Solution Architecture

### 1. Per-Session Streaming State
We now maintain streaming state for each session independently using:

```typescript
interface StreamingState {
  isStreaming: boolean;
  messageId: number;
  content: string;
  agent?: string;
  statusMessages: StatusMessageProps[];
}
const streamingStatesRef = useRef<Map<string, StreamingState>>(new Map());
const streamControllersRef = useRef<Map<string, StreamController>>(new Map());
```

### 2. State Preservation on Tab Switch
When switching away from a streaming chat:
- Save current streaming state to the map
- Update message with accumulated content
- Clear UI streaming state (but keep background streaming active)
- Do NOT abort the stream

When switching back to a streaming chat:
- Check if session has saved streaming state
- Restore streaming UI if still active
- Display accumulated content

### 3. Background Streaming Updates
Streaming continues in background:
- `onToken` callbacks update the streaming state map
- Message content is updated in the messages array
- UI only updates if the session is active

### 4. Visual Indicators
- Active streaming shows real-time content updates
- Background streaming shows loading spinner in sidebar
- Blue dot appears for completed messages in background sessions

## Implementation Details

### ChatUI.tsx Changes

1. **Streaming State Management** (lines 189-198)
   - Added `streamingStatesRef` to track per-session state
   - Added `streamControllersRef` to manage multiple stream controllers

2. **Tab Switch Logic** (lines 333-381)
   - Save streaming state when switching away
   - Restore streaming state when switching back
   - Update messages with partial content

3. **Stream Callbacks** (lines 495-533)
   - Update streaming state map for all sessions
   - Only update UI state for active session
   - Preserve content in messages array

4. **Message Rendering** (lines 1090-1118)
   - Check both UI state and streaming state map
   - Display streaming content from appropriate source
   - Show streaming indicator when applicable

5. **Cleanup Logic** (lines 385-396)
   - Only abort streams on component unmount
   - Preserve streams when switching tabs

## Testing Instructions

### Test 1: Basic Tab Switching During Streaming
1. Start a message in Chat A
2. While streaming, switch to Chat B
3. Verify Chat A shows loading spinner in sidebar
4. Switch back to Chat A
5. Verify streaming content is preserved and continues

### Test 2: Multiple Concurrent Streams
1. Start message in Chat A
2. Switch to Chat B and start another message
3. Switch between chats during streaming
4. Verify both streams complete successfully

### Test 3: Background Completion
1. Start message in Chat A
2. Switch to Chat B and wait
3. Verify Chat A shows blue dot when complete
4. Switch back to Chat A
5. Verify full message is displayed

## Benefits
1. **No Lost Content**: Streaming content is preserved when switching tabs
2. **Better UX**: Users can multitask between chats
3. **Background Processing**: Messages complete even when not viewing
4. **Visual Feedback**: Clear indicators for streaming and unread messages

## Future Enhancements
1. Add "Streaming..." text indicator in sidebar
2. Show partial message preview in sidebar tooltip
3. Add option to pause/resume streams
4. Implement stream priority management for multiple active streams