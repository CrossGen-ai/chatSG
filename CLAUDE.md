# ChatSG Project Context for Claude

## Project Overview
ChatSG is a sophisticated multi-agent conversational AI platform that I'm helping to set up and potentially integrate Claude into.

## Architecture Summary
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (glassmorphism UI)
- **Backend**: Node.js + Express + LangGraph/LangChain orchestration
- **Agent System**: Modular architecture with specialized agents (Analytical, Creative, Technical)
- **Storage**: PostgreSQL database with intelligent memory layer (Mem0 + Qdrant + Neo4j)

## Current Status (2025-07-06)
- ✅ Dependencies installed (frontend needs --legacy-peer-deps)
- ✅ TypeScript compiled (npm run build in backend)
- ✅ Backend configured with LLM provider
- ✅ Orchestrator initialized and working
- ✅ Removed localStorage for chat data (now using remote storage)
- ✅ Added skeleton loading animations for better UX
- ✅ Implemented optimistic updates with rollback
- ✅ Simplified backend API (removed redundant endpoints)
- ✅ Auto-session creation on first message
- ✅ Implemented PostgreSQL-based storage system with intelligent memory
- ✅ Mem0 semantic memory extraction with Qdrant vector storage  
- ✅ Neo4j graph relationships for contextual understanding
- ✅ Separate tool execution logging in PostgreSQL
- ✅ Context management with configurable limits and memory-aware retrieval
- ✅ Session status tracking (active/inactive/archived/deleted)
- ✅ tmux-mcp integration for server management via Claude Code
- ✅ Comprehensive security middleware implementation
- ✅ SSE streaming with security (CSRF, rate limiting)
- ✅ Markdown formatting with XSS protection
- ✅ Real-time tool status streaming with inline results display
- ✅ Unified tool-response messages (no duplicate content)

## Key Features Implemented
1. **PostgreSQL Storage**: Scalable chat message storage with full ACID compliance
2. **Intelligent Memory**: Mem0-powered semantic memory extraction and storage
3. **Vector Search**: Qdrant-based similarity search for contextual memory retrieval
4. **Graph Relationships**: Neo4j for understanding entity relationships and connections
5. **Tool Logging**: Comprehensive tool execution tracking in PostgreSQL
6. **Context Management**: Memory-aware context building with configurable limits
7. **Session Lifecycle**: Active → Inactive → Archived → Deleted states with proper cleanup
8. **Agent Tracking**: Records which agent responded to each message with memory integration
9. **Dynamic Avatars**: 📊 Analytical, 🎨 Creative, ⚙️ Technical, 🎧 Support, 💼 CRM
10. **Security Layer**: Comprehensive security middleware with:
   - Header-based CSRF protection (X-CSRF-Token)
   - Rate limiting (IP-based and connection-based)
   - Input validation and sanitization
   - XSS prevention with DOMPurify
   - Security headers via Helmet.js
11. **SSE Security**: Special security handling for streaming endpoints
12. **Markdown Support**: Real-time markdown rendering with security
13. **Tool Status Streaming**: Real-time visibility of tool execution with:
    - Live status updates (starting, running, completed, error)
    - Inline expandable tool messages in chat UI
    - Formatted results display (e.g., CRM contacts with lead scores)
    - Unified tool-response messages to prevent duplication

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
│   │   └── storage/  # PostgreSQL storage system + Mem0 integration
│   ├── data/         # Legacy data storage (migrated to PostgreSQL)
│   │   └── sessions/ # Legacy JSONL files (now PostgreSQL)
│   └── server.js     # Main server file (updated with storage)
├── docs/             # Comprehensive documentation
└── shrimp-data/      # MCP integration with task history
```

## Environment Configuration Needed
```bash
# Application environment
CHATSG_ENVIRONMENT=dev  # Application-specific environment
NODE_ENV=development    # Node.js ecosystem standard

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

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/chatsg
# OR individual settings:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=chatsg

# Memory System (Mem0 + Qdrant + Neo4j)
MEM0_ENABLED=true
MEM0_PROVIDER=qdrant
MEM0_EMBEDDING_MODEL=text-embedding-3-small
MEM0_LLM_MODEL=gpt-4o-mini

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# Neo4j Graph Database (optional)
MEM0_GRAPH_ENABLED=true
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

## Claude Integration Opportunities
1. **New Provider**: Add Claude to llm-helper.js alongside OpenAI/Azure
2. **Specialized Agent**: Create Claude-powered agent for specific tasks
3. **Enhanced Orchestration**: Use Claude for intelligent agent routing
4. **Tool Integration**: Leverage Claude's function calling capabilities
5. **Memory System**: Integrate Claude with Mem0 for enhanced semantic understanding

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

# Memory system tests
cd backend && node tests/test-memory-quick.js    # Quick memory pipeline test
cd backend && node tests/test-memory-pipeline.js # Comprehensive memory test

# Security tests
npm run test:security            # Run all security tests
npm run test:security:sse        # Test SSE security
npm run test:security:middleware # Test security middleware
npm run test:security:regression # Run regression test suite
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
- `/backend/src/storage/StorageManager.ts` - Unified storage interface with Mem0 integration
- `/backend/src/storage/PostgresSessionStorage.ts` - PostgreSQL message storage
- `/backend/src/storage/PostgresSessionIndex.ts` - PostgreSQL session index
- `/backend/src/memory/Mem0Service.ts` - Intelligent memory service with Qdrant/Neo4j
- `/backend/src/config/storage.config.ts` - Storage configuration
- `/backend/middleware/security/` - Security middleware components
- `/backend/middleware/security/csrf-header.js` - Header-based CSRF protection
- `/backend/middleware/security/sse.js` - SSE-specific security
- `/backend/tests/test-all-security.js` - Comprehensive security test runner
- `/frontend/src/hooks/useChatManager.tsx` - Chat state management
- `/frontend/src/components/ToolStatusMessage.tsx` - Tool execution display component
- `/backend/src/tools/Tool.ts` - Base tool class with streaming support
- `/backend/src/tools/crm/ContactManagerTool.ts` - CRM tool with formatted results
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