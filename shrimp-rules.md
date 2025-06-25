# ChatSG Project Standards & Guidelines

## Project Overview
ChatSG is a modern AI-powered chat application built with a React frontend and Node.js backend, featuring multiple AI backend options including LangGraph agents, n8n webhooks, and development simulation modes.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 with custom properties
- **UI Components**: Custom glassmorphism design
- **State Management**: React hooks and local storage
- **Themes**: 5 persistent themes (Light, Dark, Blue, Emerald, Rose)

### Backend
- **Runtime**: Node.js with Express
- **AI Backends**: 
  - Orchestration system (primary - intelligent agent selection and routing)
  - n8n webhook integration (via orchestration)
  - Generic simulation mode (via orchestration)
- **Environment**: dotenv configuration
- **Dependencies**: axios, @langchain packages

### Development Tools
- **Package Manager**: npm
- **Testing**: Custom test suite in `backend/tests/`
- **Deployment**: PowerShell automation scripts
- **Documentation**: Markdown with comprehensive guides

## Project Structure

```
chatSG/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ChatUI.tsx   # Main chat interface
│   │   │   └── ThemeSwitcher.tsx # Theme management
│   │   ├── api/             # API utilities
│   │   └── index.css        # Theme variables & styles
│   ├── public/              # Static assets
│   └── dist/                # Production build
├── backend/                 # Node.js server
│   ├── server.js           # Main server with routing
│   ├── agent/              # Legacy agents
│   │   └── AgentRouter/    # Classification agent
│   │       ├── agent.js    # AgentRouter implementation
│   │       └── package.json # Agent dependencies
│   ├── src/                # Modern TypeScript agents
│   │   ├── agents/         # Modular agent system
│   │   ├── orchestrator/   # Orchestration system
│   │   └── state/          # State management
│   ├── tests/              # Test suite
│   │   ├── run-tests.js    # Test runner
│   │   ├── test-*.js       # Individual tests
│   │   └── README.md       # Test documentation
│   ├── .env                # Environment configuration
│   └── package.json        # Backend dependencies
├── deploy.ps1              # Full deployment script
├── quick-deploy.ps1        # Fast code-only deployment
└── manual-deployment-steps.md # Server setup guide
```

## Backend Architecture

### Routing System
The backend uses environment-based routing with orchestration as the primary system:

#### Backend Modes
1. **Orchestration Mode** (`BACKEND=Orch`) - **RECOMMENDED DEFAULT**
   - Intelligent agent selection and routing
   - Handles n8n and Generic backends through orchestration
   - Best performance and scalability
   - Provides unified interface for all backend types

2. **n8n Mode** (`BACKEND=n8n`)
   - Direct webhook integration
   - Forwards requests to configured webhook URL
   - Requires `WEBHOOK_URL` environment variable

3. **Generic Mode** (`BACKEND=Generic`)
   - Simulated AI responses for development
   - No external dependencies
   - Instant responses with contextual simulation

### Environment Configuration
```bash
# Backend routing (Orch is recommended)
BACKEND=Orch|n8n|Generic

# Legacy support
ENVIRONMENT=dev|production

# n8n webhook (for BACKEND=n8n)
WEBHOOK_URL=http://localhost:5678/webhook/chat

# LLM credentials (for orchestration system)
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=your_endpoint_here
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001
```

## LLM Helper Utility

### Features
- **Multi-Provider Support**: Automatic detection of OpenAI vs Azure OpenAI
- **Environment-Based Configuration**: Different settings for dev/production
- **Centralized Configuration**: Single source of truth for all LLM settings
- **Validation**: Built-in configuration validation and error reporting

### Implementation
- **Location**: `backend/utils/llm-helper.js`
- **Singleton Pattern**: Single instance shared across all agents
- **Provider Detection**: Automatic based on available environment variables
- **Configuration**: Environment-specific temperature and token limits

### Provider Support
```javascript
// OpenAI Configuration
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

// Azure OpenAI Configuration  
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-001
```

## Orchestration System

### Features
- **Intelligent Agent Selection**: Automatically routes requests to appropriate agents
- **Multi-Backend Support**: Handles n8n webhooks and generic simulation through unified interface
- **Session Management**: Persistent conversation context and state management
- **Error Handling**: Graceful fallbacks and comprehensive error reporting

### Implementation
- **Location**: `backend/src/orchestrator/`
- **Core Components**: AgentOrchestrator, BackendIntegration, OrchestrationMiddleware
- **Agent Support**: Individual agents, agencies, and legacy agent wrappers
- **State Management**: Integrated with StateManager for session persistence

## Frontend Architecture

### Component Structure
- **App.tsx**: Main application with routing and layout
- **ChatUI.tsx**: Chat interface with message handling
- **ThemeSwitcher.tsx**: Theme selection and persistence

### Theme System
Uses CSS custom properties for dynamic theming:
```css
:root {
  --theme-bg: /* gradient background */;
  --theme-accent: /* accent color */;
  --theme-text-primary: /* primary text */;
}
```

### API Integration
- **Endpoint**: `/api/chat`
- **Method**: POST
- **Payload**: `{ message: string, sessionId?: string }`
- **Response**: `{ message: string, _backend: string, ... }`

## Development Workflow

### Local Development
```bash
# Start both frontend and backend
npm run dev:all

# Or start individually
cd frontend && npm run dev    # Frontend on :5174
cd backend && npm start       # Backend on :3000
```

### Testing
```bash
# Run all tests
cd backend/tests && node run-tests.js

# Run specific test
node run-tests.js test-env.js

# Test backend routing
node test-all-backends.js
```

### Backend Mode Testing
```bash
# Test Orchestration mode (recommended)
echo "BACKEND=Orch" > backend/.env
cd backend && node server.js

# Test Generic mode
echo "BACKEND=Generic" > backend/.env
cd backend && node server.js

# Test n8n mode
echo "BACKEND=n8n" > backend/.env
echo "WEBHOOK_URL=your_webhook" >> backend/.env
cd backend && node server.js
```

## Deployment

### Automated Deployment
```bash
# Full deployment (includes npm install)
.\deploy.ps1

# Quick deployment (code only)
.\quick-deploy.ps1

# Deploy with environment override
.\deploy.ps1 -UploadEnv
```

### Manual Deployment
See `manual-deployment-steps.md` for detailed server setup instructions.

### Environment Protection
- Remote `.env` files are protected from accidental overwrites
- Use `-UploadEnv` flag to explicitly update remote environment
- Quick deploy never uploads environment files

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for frontend components
- Prefer async/await over promises
- Use descriptive variable names
- Include error handling for all async operations

### React Components
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Handle loading and error states
- Use semantic HTML elements

### Backend API
- RESTful endpoint design
- Consistent error response format
- Environment-based configuration
- Comprehensive logging with prefixes

### CSS/Styling
- Use Tailwind utility classes
- Implement responsive design patterns
- Leverage CSS custom properties for theming
- Follow glassmorphism design principles

## Testing Standards

### Test Organization
- All tests in `backend/tests/` directory
- Descriptive test names and documentation
- Automated test runner with summary reporting
- Individual and comprehensive test options

### Test Coverage
- Environment variable loading
- Backend routing for all modes
- API endpoint functionality
- AgentZero session management

### Test Requirements
- Environment tests: No dependencies
- Backend tests: Running server required
- AgentZero tests: Azure OpenAI credentials required

## Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use different credentials for development/production
- Protect Azure OpenAI keys and endpoints
- Validate webhook URLs before forwarding

### API Security
- CORS headers configured for development
- Input validation on all endpoints
- Error messages don't expose sensitive information
- Session IDs are user-controlled (consider UUID generation)

## Performance Guidelines

### Frontend Optimization
- Vite build optimization enabled
- Component lazy loading where appropriate
- Efficient re-rendering with proper dependencies
- Theme switching without page reload

### Backend Optimization
- Session memory cleanup for long-running processes
- Efficient LangGraph state management
- Webhook timeout handling
- Graceful error recovery

## Troubleshooting

### Common Issues
1. **Environment variables not loading**: Check file encoding and dotenv path
2. **Backend routing not working**: Verify BACKEND variable and restart server
3. **AgentZero initialization fails**: Check Azure OpenAI credentials
4. **Theme switching not working**: Verify CSS custom properties support

### Debug Tools
- Environment test: `node backend/tests/test-env.js`
- Backend test: `node backend/tests/test-all-backends.js`
- Server logs: Check console output for routing mode
- Network tab: Verify API requests and responses

This documentation should be updated as the project evolves and new features are added. 