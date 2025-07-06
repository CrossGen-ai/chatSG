# ChatSG - Multi-Agent Conversational AI Platform

## Overview

ChatSG is a sophisticated multi-agent conversational AI platform featuring specialized agents, real-time streaming responses, and intelligent memory management. The system uses LangGraph/LangChain for orchestration and supports multiple LLM providers.

## Key Features

- **Multi-Agent System**: Specialized agents (Analytical, Creative, Technical, CRM) with automatic routing
- **CRM Integration**: Deep Insightly CRM integration with LLM-driven query understanding
- **Real-Time Streaming**: Token-by-token response streaming with Server-Sent Events (SSE)
- **Intelligent Memory**: Mem0 integration with Neo4j graph database for context-aware conversations
- **Cross-Session Memory**: Optional feature to maintain context across conversations
- **Persistent Storage**: JSONL-based append-only storage with fast indexing
- **Modern UI**: React 18 + TypeScript with glassmorphism design

## Security Features

- **CSRF Protection**: Header-based token implementation (X-CSRF-Token)
- **Rate Limiting**: IP-based (100 req/15min) and connection-based limits for SSE
- **XSS Prevention**: Multiple layers of input sanitization using DOMPurify
- **Input Validation**: Message length, session ID format, and content validation
- **Security Headers**: Comprehensive headers via Helmet.js (CSP, HSTS, X-Frame-Options)
- **SSE Security**: Special security handling for Server-Sent Events streaming
- **Authentication Ready**: Extensible auth middleware (mock in dev, Azure AD ready for production)
- **Defense in Depth**: Multiple security layers from network to application level

## Architecture

```
chatSG/
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── api/           # API client functions
│   │   └── services/      # Business logic services
├── backend/           # Node.js Express server
│   ├── src/
│   │   ├── agents/        # Agent implementations
│   │   ├── routing/       # Orchestration system
│   │   ├── state/         # State management
│   │   └── storage/       # Storage system (JSONL + Index)
│   ├── utils/            # Utility functions
│   └── server.js         # Main server file
├── docs/              # Comprehensive documentation
└── data/              # Data storage
    └── sessions/      # JSONL chat files
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key or Azure OpenAI credentials
- (Optional) Neo4j database for advanced memory features

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chatSG

# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API credentials
```

### Environment Configuration

```bash
# Application environment
CHATSG_ENVIRONMENT=dev  # Application-specific environment (dev/production)
NODE_ENV=development    # Node.js ecosystem standard (development/production)

# Backend routing mode
BACKEND=Orch  # Recommended for multi-agent orchestration

# LLM Provider (choose one)
# Option 1: OpenAI
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# Option 2: Azure OpenAI  
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001

# CRM Configuration (optional)
INSIGHTLY_API_KEY=your_insightly_api_key
INSIGHTLY_API_URL=https://api.insightly.com/v3.1  # Optional, defaults to NA region

# Optional: Mem0 Configuration
MEM0_ENABLED=true  # Set to false to disable
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

### Running the Application

```bash
# Start both servers with tmux (recommended)
npm run dev:vis    # Creates tmux sessions + visible Terminal windows

# Or start in background only
npm run dev        # Creates detached tmux sessions

# Stop all servers
npm run stop

# View server status
npm run logs
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Core Features

### 1. Real-Time Streaming

The platform implements true token-by-token streaming using Server-Sent Events:

- **Instant feedback**: Users see responses as they're generated
- **Smooth transitions**: No UI flicker or re-renders
- **Optimized performance**: Asynchronous storage operations

### 2. Multi-Agent Architecture

Four specialized agents handle different types of queries:

- **Analytical Agent**: Data analysis, research, statistics
- **Creative Agent**: Writing, brainstorming, creative tasks  
- **Technical Agent**: Programming, debugging, technical support
- **CRM Agent**: Customer relationship management, contact search, sales pipeline analysis

The orchestrator automatically routes queries to the most appropriate agent.

### 3. Memory System

Powered by Mem0 with optional Neo4j integration:

- **Contextual Awareness**: Remembers conversation history
- **Cross-Session Memory**: Optional feature to maintain context across chats
- **Performance Optimized**: 2-second timeout prevents blocking
- **Graph Relationships**: Neo4j tracks entity relationships

### 4. Storage System

Efficient JSONL-based storage with indexing:

- **Append-only**: Messages stored in JSONL files
- **Fast lookups**: JSON index for quick session access
- **Tool logging**: Separate logs for agent tool usage
- **Automatic cleanup**: Configurable retention policies

### 5. CRM Integration

Advanced Customer Relationship Management with Insightly integration:

- **LLM-Driven Query Understanding**: Natural language CRM queries
- **Contact Management**: Search, lookup, and detailed contact information
- **Pipeline Analysis**: Sales funnel tracking and conversion insights
- **Opportunity Management**: Deal tracking and forecasting
- **Lead Scoring**: Automated lead qualification and scoring
- **Slash Command Support**: Force CRM routing with `/crm`, `/customer`, `/sales`

**Example Queries:**
- "Find contacts at Microsoft"
- "Give me full details of Peter Kelly"
- "Show pipeline status for Q4"
- "What deals are close to closing?"

See [CRM Integration Documentation](docs/crm-integration.md) for detailed setup and usage.

## Recent Improvements

### Streaming Performance Optimization (Latest)

1. **Eliminated Post-Streaming Delay**
   - Moved Mem0 save operations to run asynchronously after sending 'done' event
   - UI updates immediately instead of waiting 5+ seconds

2. **Fixed UI Flicker**
   - Messages update content during streaming instead of after
   - Prevents bubble disappearing and reappearing
   - Smooth transition from streaming to final state

3. **Optimized Background Sync**
   - Disabled unnecessary syncs during active operations
   - Prevents re-renders during streaming

### Lessons Learned

1. **Async Operations**: Heavy operations (like Mem0 saves) should run after sending responses
2. **State Management**: Update content during streaming, not after completion
3. **React Optimization**: Minimize array replacements to prevent re-renders
4. **Background Tasks**: Disable background syncs during active operations

## Development

### Running Tests

```bash
cd backend/tests
node run-tests.js
```

### Performance Testing

```bash
# Test streaming performance
cd backend/tests
node test-performance.js

# Trace streaming delays
node trace-delays.js
```

### MCP Integration

The project includes tmux-mcp integration for server management via Claude Code:

```bash
# View available MCP commands
cat .mcp.json

# Custom commands available:
/server-status     # Check both servers
/restart-servers   # Stop and restart servers
```

## Troubleshooting

### Streaming Issues

1. **No response appearing**: Check browser console for errors
2. **Slow initial response**: Mem0 initialization may take 2-3 seconds
3. **Messages disappearing**: Hard refresh the browser (Cmd+Shift+R)

### Memory Issues

1. **Mem0 timeouts**: Check Neo4j connection
2. **Disable Mem0**: Set `MEM0_ENABLED=false` in `.env`
3. **Clear memory**: Delete files in `data/sessions/`

### Server Issues

1. **Port conflicts**: Ensure ports 3000 and 5173 are free
2. **Process cleanup**: Run `npm run stop` to kill all servers
3. **Check logs**: Run `npm run logs` for recent activity

## Future Enhancements / Backlog

### High Priority
1. **Scroll Position Management**: Clean up scroll positioning when switching between chats rapidly
   - Handle quick back-and-forth tab switching
   - Preserve scroll position per chat
   - Smooth scroll restoration

### Critical Features to Preserve
⚠️ **IMPORTANT**: The following features are critical and must NEVER be broken in future updates:

1. **Background Streaming Support**
   - Messages continue streaming when switching tabs
   - Content is preserved and accessible when returning to a chat
   - Multiple concurrent streams are supported
   - See `docs/streaming-state-management.md` for implementation details

2. **Unread Message Indicators**
   - Blue dots appear for messages received in background chats
   - Active chat never shows blue dots for its own messages
   - Unread counts are properly tracked per session

### Medium Priority
- Enhanced streaming status indicators in sidebar
- Partial message preview tooltips
- Stream pause/resume functionality
- Better error recovery for interrupted streams

### Low Priority
- Stream priority management for resource optimization
- Streaming bandwidth throttling options
- Export streaming analytics

## Contributing

See `CLAUDE.md` for AI assistant guidelines and `docs/` for detailed documentation.

## License

[License information here]