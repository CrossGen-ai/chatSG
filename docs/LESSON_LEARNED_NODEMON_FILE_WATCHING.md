# Lesson Learned: Nodemon File Watching Causes Server Crashes

## Issue Description
**Date**: 2025-06-26  
**Symptoms**: Frontend receives "socket hang up" errors when making API calls to the backend

## Root Cause
The backend server was restarting mid-request due to nodemon detecting file changes in the `data/` directory. When the chat system saves messages or updates the session index, nodemon would detect these changes and restart the server, dropping active connections.

## Sequence of Events
1. Frontend sends request to `/api/chat`
2. Backend begins processing with orchestrator
3. SessionStorage saves message to `data/sessions/[sessionId].jsonl`
4. SessionIndex updates `data/sessions/index.json`
5. Nodemon detects file change and restarts server
6. Active HTTP connection is dropped
7. Frontend receives "socket hang up" error

## Solution
Created a `nodemon.json` configuration file to exclude the data directory from file watching:

```json
{
  "ignore": [
    "data/*",
    "dist/*",
    "node_modules/*",
    "tests/*",
    "*.test.js",
    "*.spec.js"
  ],
  "watch": [
    "server.js",
    "src/**/*",
    "utils/**/*"
  ],
  "ext": "js,json",
  "delay": "1000"
}
```

## Key Takeaways
1. **Always configure nodemon properly** when your application writes to local files during runtime
2. **Exclude data directories** from file watchers to prevent unnecessary restarts
3. **Monitor server logs** when debugging connection issues - the restart messages are a clear indicator
4. **Test file-writing operations** thoroughly in development environments with file watchers

## Prevention
- Add nodemon.json to project templates
- Document which directories contain runtime-generated files
- Consider using separate directories for:
  - Source code (watched)
  - Generated/compiled code (ignored)
  - Runtime data (ignored)
  - Test outputs (ignored)

## Related Files
- `/backend/nodemon.json` - The configuration that fixed the issue
- `/backend/src/storage/` - Storage system that writes to files
- `/backend/data/sessions/` - Directory containing runtime data