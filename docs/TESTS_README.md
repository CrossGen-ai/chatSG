# ChatSG Backend Tests

This directory contains all test files for the ChatSG backend system.

## Test Files

### Core Tests
- **`test-env.js`** - Tests environment variable loading and dotenv configuration
- **`test-llm-helper.js`** - Tests LLM helper utility for provider configuration
- **`test-backend.js`** - Simple backend API test
- **`test-all-backends.js`** - Comprehensive test for all backend routing modes

### Agent Tests
- **`test-agent-zero.js`** - Tests LangGraph AgentZero functionality (requires LLM credentials)

### Test Runner
- **`run-tests.js`** - Automated test runner for all tests

## Running Tests

### Run All Tests
```bash
cd backend/tests
node run-tests.js
```

### Run Specific Test
```bash
cd backend/tests
node run-tests.js test-llm-helper.js
# or
node run-tests.js "llm helper"
```

### Run Individual Tests
```bash
cd backend/tests
node test-env.js
node test-llm-helper.js
node test-all-backends.js
node test-agent-zero.js
```

### NPM Test Scripts
```bash
cd backend
npm test              # Run all tests
npm run test:env      # Environment variables test
npm run test:llm      # LLM helper test
npm run test:backend  # Backend routing tests
npm run test:agent    # AgentZero test
```

## Test Requirements

### Environment Variables Test
- No special requirements
- Tests dotenv loading from `../env`

### LLM Helper Test
- No special requirements for basic functionality testing
- Shows configuration validation results
- Demonstrates provider detection and system prompt generation

### Backend Routing Tests
- Requires backend server to be running: `cd backend && node server.js`
- Tests all three backend modes: Generic, n8n, Lang

### AgentZero Test
- Requires LLM credentials in `.env` file (OpenAI or Azure OpenAI)
- Uses LLM helper utility for provider configuration

## LLM Configuration

The LLM helper utility supports multiple providers with automatic detection:

### OpenAI Configuration
```bash
# Add to .env file
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1  # optional
```

### Azure OpenAI Configuration
```bash
# Add to .env file
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001  # optional, defaults to gpt-4o-001
AZURE_OPENAI_API_VERSION=2024-02-15-preview  # optional
```

### LLM Behavior Configuration
```bash
# Optional overrides
LLM_TEMPERATURE=0.7      # 0.0-1.0, defaults based on environment
LLM_MAX_TOKENS=3000      # Max response tokens, defaults based on environment
```

## Backend Modes

The tests verify three different backend routing modes:

1. **Generic Mode** (`BACKEND=Generic`)
   - Simulated responses for development
   - No external dependencies required

2. **n8n Mode** (`BACKEND=n8n`)
   - Forwards requests to webhook
   - Requires `WEBHOOK_URL` in .env

3. **Lang Mode** (`BACKEND=Lang`)
   - Uses LangGraph AgentZero with LLM helper
   - Automatically detects and configures LLM provider
   - Supports both OpenAI and Azure OpenAI

## Test Output

Tests provide detailed output including:
- ✅/❌ Pass/fail status
- 📥 Response messages
- 🔧 Backend mode identification
- 📊 Response metadata
- 🔗 Session information (for AgentZero)
- 🤖 LLM provider and model information

## Troubleshooting

### Server Not Running
If backend routing tests fail with connection errors:
```bash
cd backend
node server.js
```

### Environment Variables Not Loading
If environment tests show `undefined` values:
1. Check that `backend/.env` file exists
2. Verify file encoding (should be ASCII/UTF-8 without BOM)
3. Recreate .env file if needed:
   ```bash
   cd backend
   echo "ENVIRONMENT=dev" > .env
   echo "BACKEND=Generic" >> .env
   ```

### LLM Configuration Issues
If LLM helper or AgentZero tests fail:
1. **For OpenAI**: Add `OPENAI_API_KEY` to .env file
2. **For Azure OpenAI**: Add `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` to .env file
3. **Provider Detection**: LLM helper automatically chooses provider based on available credentials
4. **Validation**: Run `npm run test:llm` to check configuration

### AgentZero Initialization Fails
If AgentZero tests fail:
1. Verify LLM credentials using `npm run test:llm`
2. Check network connectivity to LLM endpoint
3. Ensure LangChain dependencies are installed: `npm install`
4. Review server logs for detailed error messages

## Environment-Based Behavior

The LLM helper adjusts settings based on environment:

- **Production** (`ENVIRONMENT=production`):
  - Temperature: 0.3 (more conservative)
  - Max Tokens: 2000 (cost-effective)
  
- **Development** (`ENVIRONMENT=dev`):
  - Temperature: 0.7 (more creative)
  - Max Tokens: 4000 (generous for testing)

- **Default**:
  - Temperature: 0.5 (balanced)
  - Max Tokens: 3000 (moderate) 