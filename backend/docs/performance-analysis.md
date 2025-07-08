# Performance Analysis - ChatSG Backend

## Issue Summary
User experiences 8+ second delays before seeing agent selection in the frontend, while tests show sub-second performance.

## Root Causes Identified

### 1. Database Operations (7+ seconds)
- The "database" timer includes ALL operations from start to finish
- Session operations are file-based, not actual PostgreSQL queries
- File I/O operations are accumulating to 7+ seconds

### 2. Qdrant Vector Store (3+ seconds)
- Initial health check takes 3.3 seconds
- Memory searches are timing out after 10 seconds
- Collections exist but searches are extremely slow

### 3. Memory Operations (10+ seconds timeout)
- Mem0 context retrieval times out after 10 seconds
- Falls back to minimal context
- This happens DURING agent message processing

## Performance Breakdown

From production logs:
```
database operations: 7,073ms
├── check-session: ~3,000ms (estimated)
└── save-user-message: ~4,000ms (estimated)

agent operations: 4,431ms
├── selection: 0.87ms ✅
└── execution: 4,430ms
    ├── memory retrieval: 3,216ms (timeout at 10s)
    └── LLM TTFT: 3,478ms

Total time: ~11.5 seconds
```

## Why Tests Show Different Performance

1. **Mock Operations**: Tests use `setTimeout()` to simulate delays
2. **No Real I/O**: No actual file or network operations
3. **No Vector Search**: Qdrant operations are mocked
4. **No Memory System**: Mem0 is not actually called

## Immediate Fixes Needed

### 1. Session Storage Optimization
- Session checks are reading entire JSONL files
- Need to use the index.json for existence checks
- Implement write buffering/batching

### 2. Qdrant Connection Pooling
- Initial connection is very slow
- Need persistent connection or warm-up
- Consider local caching of frequent searches

### 3. Memory Timeout Adjustment
- 10 second timeout is being hit regularly
- Either optimize queries or reduce timeout
- Add caching for recent memories

### 4. Move Non-Critical Operations
- Save user message AFTER sending agent selection
- Move memory storage to background
- Use write-behind caching

## Recommended Architecture Changes

1. **Use Real Database for Sessions**
   - PostgreSQL session table instead of JSONL files
   - Indexed queries instead of file scanning
   - Connection pooling already in place

2. **Optimize Vector Store**
   - Pre-warm Qdrant connections
   - Implement connection pooling
   - Cache recent search results

3. **Async Operations**
   - Send agent selection immediately
   - Process memory operations in background
   - Stream responses while saving state

4. **Add Circuit Breakers**
   - Fail fast on slow operations
   - Use cached/default values when services are slow
   - Implement progressive degradation