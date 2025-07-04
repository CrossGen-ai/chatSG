# ChatSG Project Context for Claude

## Project Overview
ChatSG is a sophisticated multi-agent conversational AI platform that I'm helping to set up and potentially integrate Claude into.

## Architecture Summary
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (glassmorphism UI)
- **Backend**: Node.js + Express + LangGraph/LangChain orchestration
- **Agent System**: Modular architecture with specialized agents (Analytical, Creative, Technical)
- **Storage**: JSONL file-based persistence with comprehensive index for fast lookups

## Current Status (2025-07-04)
- ✅ Dependencies installed (frontend needs --legacy-peer-deps)
- ✅ TypeScript compiled (npm run build in backend)
- ❌ Backend needs .env configuration for LLM provider
- ❌ Orchestrator not initialized (waiting for LLM credentials)
- ✅ Removed localStorage for chat data (now using remote storage)
- ✅ Added skeleton loading animations for better UX
- ✅ Implemented optimistic updates with rollback
- ✅ Simplified backend API (removed redundant endpoints)
- ✅ Auto-session creation on first message
- ✅ Implemented JSONL-based storage system with index
- ✅ Separate tool execution logging
- ✅ Context management with configurable limits
- ✅ Session status tracking (active/inactive/archived/deleted)
- ✅ tmux-mcp integration for server management via Claude Code
- ✅ Comprehensive security middleware implementation
- ✅ SSE streaming with security (CSRF, rate limiting)
- ✅ Markdown formatting with XSS protection

## Key Features Implemented
1. **JSONL Storage**: Append-only chat messages in `./data/sessions`
2. **Fast Index**: `index.json` for quick session lookups and metadata
3. **Tool Logging**: Separate JSONL files for tool execution tracking
4. **Context Management**: Configurable message limits for LLM context
5. **Session Lifecycle**: Active → Inactive → Archived → Deleted states
6. **Agent Tracking**: Records which agent responded to each message
7. **Dynamic Avatars**: 📊 Analytical, 🎨 Creative, ⚙️ Technical, 🎧 Support
8. **Security Layer**: Comprehensive security middleware with:
   - Header-based CSRF protection (X-CSRF-Token)
   - Rate limiting (IP-based and connection-based)
   - Input validation and sanitization
   - XSS prevention with DOMPurify
   - Security headers via Helmet.js
9. **SSE Security**: Special security handling for streaming endpoints
10. **Markdown Support**: Real-time markdown rendering with security

## Project Structure
```
chatSG/
├── frontend/          # React app on port 5174
├── backend/          # Node.js API on port 3000
│   ├── dist/         # Compiled TypeScript
│   ├── src/          # Source TypeScript files
│   │   ├── agents/   # Agent implementations
│   │   ├── routing/  # Orchestration system
│   │   ├── state/    # State management
│   │   └── storage/  # New storage system (JSONL + Index)
│   ├── data/         # Data storage
│   │   └── sessions/ # JSONL chat files + index.json
│   └── server.js     # Main server file (updated with storage)
├── docs/             # Comprehensive documentation
└── shrimp-data/      # MCP integration with task history
```

## Environment Configuration Needed
```bash
# Backend routing mode
BACKEND=Orch  # Recommended

# LLM Provider (choose one)
# Option 1: OpenAI
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# Option 2: Azure OpenAI  
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001
```

## Claude Integration Opportunities
1. **New Provider**: Add Claude to llm-helper.js alongside OpenAI/Azure
2. **Specialized Agent**: Create Claude-powered agent for specific tasks
3. **Enhanced Orchestration**: Use Claude for intelligent agent routing
4. **Tool Integration**: Leverage Claude's function calling capabilities
5. **Memory System**: Use Claude's large context for cross-session features

## Commands to Run
```bash
# Start both servers (from project root)
npm run dev          # Background tmux sessions only
npm run dev:vis      # tmux sessions + visible Terminal windows (recommended)

# Stop servers
npm run stop         # Stops all servers and tmux sessions

# View logs/status
npm run logs         # Check server status and recent logs

# Manual tmux control
tmux ls                          # List all sessions
tmux attach -t chatsg-backend    # Attach to backend
tmux attach -t chatsg-frontend   # Attach to frontend
# Detach: Ctrl+B, then D

# Tests
cd backend/tests && node run-tests.js

# Security tests
npm run test:security            # Run all security tests
npm run test:security:sse        # Test SSE security
npm run test:security:middleware # Test security middleware
```

## Server Management Details
The project uses tmux for persistent server sessions:
- **Background mode** (`npm run dev`): Creates detached tmux sessions
- **Visible mode** (`npm run dev:vis`): Creates tmux sessions AND opens Terminal windows attached to them
- **Benefits**: Servers persist even if Terminal windows close
- **Frontend**: Runs on port 5173 (Vite default)
- **Backend**: Runs on port 3000

## MCP Integration (Claude Code)
The project includes tmux-mcp integration for server management:
- Configuration: `.mcp.json` 
- Server control via Claude Code without manual terminal management
- Available MCP tools:
  - `list-sessions`: View all tmux sessions
  - `capture-pane`: Read server logs without attaching
  - `execute-command`: Run commands in server sessions
- Custom commands in `.claude/commands/`:
  - `/server-status`: Check both servers
  - `/restart-servers`: Stop and restart servers
- See `docs/mcp-server-management.md` for details

## Important Files
- `/backend/utils/llm-helper.js` - LLM provider abstraction
- `/backend/src/routing/AgentOrchestrator.ts` - Agent selection logic
- `/backend/server.js` - Main API server (now with storage integration and security)
- `/backend/src/storage/StorageManager.ts` - Unified storage interface
- `/backend/src/storage/SessionStorage.ts` - JSONL message storage
- `/backend/src/storage/SessionIndex.ts` - Fast session index
- `/backend/src/config/storage.config.ts` - Storage configuration
- `/backend/middleware/security/` - Security middleware components
- `/backend/middleware/security/csrf-header.js` - Header-based CSRF protection
- `/backend/middleware/security/sse.js` - SSE-specific security
- `/backend/tests/test-all-security.js` - Comprehensive security test runner
- `/frontend/src/hooks/useChatManager.tsx` - Chat state management
- `/backend/.env` - Environment configuration (needs setup)

## Shrimp-data MCP Notes
- Contains task history showing recent feature implementations
- WebGUI available at http://localhost:59011?lang=en
- Tasks show comprehensive chat persistence system was recently built

## Development Guidelines (from shrimp-rules.md)
- Use TypeScript for frontend
- Prefer async/await over promises
- Include error handling for all async operations
- Follow existing patterns for consistency
- Never commit .env files
- Test with `cd backend/tests && node run-tests.js`