# ChatSG Backend Tests

Organized test suite for the ChatSG backend system.

## Test Organization

```
tests/
├── agents/          # Agent-specific tests
├── memory/          # Memory, storage, and Neo4j tests  
├── integration/     # API and system integration tests
├── security/        # Security, validation, and XSS tests
├── unit/           # Unit tests for individual components
├── utils/          # Utility and helper tests
└── typescript/     # TypeScript test files
```

## Running Tests

### All Tests
```bash
npm test                    # Run main test suite
```

### Category-Specific Tests

#### Agent Tests
```bash
node tests/agents/test-agent-architecture.js
node tests/agents/test-analytical-agent.js
node tests/agents/test-lazy-agent-manager.js
```

#### Memory & Storage Tests
```bash
# Neo4j tests
node tests/memory/neo4j-status.js              # Quick Neo4j connection check
node tests/memory/neo4j-simple-test.js         # Basic Neo4j operations
node tests/memory/test-mem0-with-neo4j.js      # Mem0 + Neo4j integration

# Storage tests
node tests/memory/test-chat-persistence.js     # JSONL storage system
node tests/memory/test-state-management.js     # State manager tests
```

#### Integration Tests
```bash
node tests/integration/test-chat-with-mem0.js  # Full chat + memory test
node tests/integration/test-orchestrator.js    # Agent orchestration
node tests/integration/test-new-endpoints.js   # API endpoint tests
```

#### Unit Tests
```bash
node tests/unit/test-llm-helper.js            # LLM provider tests
node tests/unit/test-tool-system.js           # Tool system tests
```

#### Security Tests
```bash
# Main security test suite
node tests/security/chat-endpoint-security.test.js    # XSS, validation tests
node tests/security/csrf.test.js                     # CSRF protection test

# Rate limiting tests
node tests/security/rate-limit-proof.test.js         # Proves rate limiting is configured
node tests/security/rate-limit-simple.test.js        # Simple rate limit test

# Additional tests (optional)
node tests/security/middleware.test.js               # Security middleware tests
node tests/security/rate-limit-burst.test.js        # Burst test (parallel requests)
```

## Test Data

Test data files:
- `test-messages.json` - Sample messages for testing
- `demo-enhanced-llm-helper.js` - Demo script for LLM functionality

## Environment Setup

Before running tests, ensure:

1. **Environment Variables** (.env file):
   ```env
   OPENAI_API_KEY=your_key_here
   MEM0_LLM_MODEL=gpt-4o-mini
   NEO4J_PASSWORD=your_password
   MEM0_GRAPH_ENABLED=true
   ```

2. **Services Running**:
   - Backend server: `npm run dev`
   - Neo4j database (if testing graph features)

3. **Build TypeScript**:
   ```bash
   npm run build
   ```

## Quick Test Commands

```bash
# Check environment
node tests/utils/test-env.js

# Test memory system
node tests/memory/neo4j-status.js
node tests/memory/test-mem0-storage-details.js

# Test chat integration
node tests/integration/test-chat-with-mem0.js

# Test specific agent
node tests/agents/test-analytical-agent.js

# Test security features
node tests/security/chat-endpoint-security.test.js
```