# Agent Development Guide

This guide explains how to develop agents in isolation using the context isolation framework. The isolation system enables coding agents to work on specific agent folders without affecting other components.

## Table of Contents

- [Overview](#overview)
- [Development Environment Setup](#development-environment-setup)
- [Isolated Development](#isolated-development)
- [Testing in Isolation](#testing-in-isolation)
- [VS Code Integration](#vs-code-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The context isolation framework provides:

- **Agent-specific configurations**: Each agent has its own TypeScript, Jest, and VS Code settings
- **Dependency isolation**: Agents only see relevant dependencies and shared services
- **Mock services**: Shared services are mocked for isolated testing and development
- **Environment separation**: Each agent can have its own environment variables and settings
- **Visual distinction**: VS Code workspace shows clear visual cues for which agent you're working on

## Development Environment Setup

### Automatic Setup

Use the development setup script to automatically configure an agent for isolated development:

```bash
# List available agents
npm run dev:list

# Set up development environment for an agent
npm run dev:setup analytical
npm run dev:setup customer-support

# Or use the script directly
node scripts/dev-agent.js setup analytical
```

### Manual Setup

If you prefer manual setup or want to understand the process:

1. **Navigate to agent directory**:
   ```bash
   cd src/agents/individual/analytical
   # or
   cd src/agents/agencies/customer-support
   ```

2. **Create agent-specific package.json**:
   ```json
   {
     "name": "@chatsg/analytical-agent",
     "private": true,
     "scripts": {
       "dev": "ts-node-dev --respawn --transpile-only agent.ts",
       "test": "jest --config jest.config.js",
       "dev:isolated": "npm run mock:shared && npm run dev",
       "test:isolated": "npm run mock:shared && npm run test"
     }
   }
   ```

3. **Create TypeScript configuration**:
   ```json
   {
     "extends": "../../../../tsconfig.json",
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@core/*": ["../../../core/*"],
         "@shared/*": ["../../../shared/*"],
         "@analytical/*": ["./*"]
       }
     },
     "include": ["./**/*.ts", "../../../core/**/*.ts", "../../../shared/**/*.ts"],
     "exclude": ["../../../agencies/**/*", "../../../orchestrator/**/*"]
   }
   ```

## Isolated Development

### Starting Development Mode

Each agent can be developed in complete isolation:

```bash
# Start analytical agent in isolation
npm run dev:analytical

# Start customer support agency in isolation  
npm run dev:customer-support

# Or from the agent directory
cd src/agents/individual/analytical
npm run dev:isolated
```

### Environment Variables

Each agent supports its own environment configuration:

```bash
# Create .env.local in agent directory
NODE_ENV=development
LOG_LEVEL=debug
AGENT_NAME=analytical
ISOLATED_MODE=true

# Mock service endpoints
MOCK_LLM_ENDPOINT=http://localhost:3001/mock-llm
MOCK_EMBEDDING_ENDPOINT=http://localhost:3001/mock-embedding
```

### Development Features

When running in isolated mode:

- **Mock Services**: All shared services are automatically mocked
- **Hot Reload**: Code changes trigger automatic restart
- **Debug Mode**: Full debugging support with source maps
- **Clean Logs**: Focused logging for the specific agent
- **Fast Startup**: Only loads necessary dependencies

## Testing in Isolation

### Running Tests

```bash
# Test specific agent in isolation
npm run test:analytical
npm run test:customer-support

# Or from agent directory
cd src/agents/individual/analytical
npm run test:isolated
```

### Test Configuration

Each agent has its own Jest configuration that:

- Only runs tests for that agent
- Mocks all shared services
- Provides agent-specific test utilities
- Generates isolated coverage reports

### Writing Tests

Example test file (`agent.test.ts`):

```typescript
import { AnalyticalAgent } from './agent';

describe('AnalyticalAgent', () => {
  let agent: AnalyticalAgent;

  beforeEach(() => {
    agent = new AnalyticalAgent();
  });

  it('should analyze numbers correctly', async () => {
    const result = await agent.processMessage('analyze: 1,2,3,4,5', 'test-session');
    
    expect(result.success).toBe(true);
    expect(result.data.mean).toBe(3);
    expect(result.data.min).toBe(1);
    expect(result.data.max).toBe(5);
  });

  it('should handle empty input gracefully', async () => {
    const result = await agent.processMessage('', 'test-session');
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('no input');
  });
});
```

### Mock Data

Global mock data is available in tests:

```typescript
// Available in all tests
global.mockAnalyticalData = {
  numbers: [1, 2, 3, 4, 5, 10, 15, 20],
  text: "The temperature is 25 degrees and the humidity is 60%",
  complexData: {
    sales: [100, 150, 200, 175, 225],
    dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
  }
};
```

## VS Code Integration

### Workspace Settings

Each agent has customized VS Code settings:

- **File filtering**: Only shows relevant files for the agent
- **Search scope**: Limits search to agent-specific code
- **Visual identity**: Colored title bar and agent icon
- **TypeScript paths**: Proper import resolution
- **Auto-formatting**: Consistent code style

### Opening Agent Workspace

```bash
# Open VS Code in agent directory for isolated development
cd src/agents/individual/analytical
code .

# Or open specific agent from root
code src/agents/individual/analytical
```

### Visual Indicators

When working on an agent, VS Code shows:

- **Title Bar**: `🤖 Analytical Agent - file.ts`
- **Color Theme**: Green for individual agents, blue for agencies
- **File Explorer**: Only relevant files and dependencies
- **IntelliSense**: Agent-specific imports and completions

### Debugging

Set up debugging configuration in `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Agent",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/agent.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Best Practices

### Agent Development

1. **Start with setup**: Always run `npm run dev:setup <agent-name>` first
2. **Use isolation**: Develop using `npm run dev:isolated` for clean environment
3. **Test frequently**: Run `npm run test:isolated` to catch issues early
4. **Mock dependencies**: Don't rely on external services during development
5. **Environment variables**: Use `.env.local` for agent-specific configuration

### Code Organization

1. **Self-contained**: Keep all agent code within the agent folder
2. **Clear imports**: Use path aliases (`@core/*`, `@shared/*`) for clean imports
3. **Type safety**: Leverage TypeScript for better development experience
4. **Documentation**: Update agent-specific README files

### Testing Strategy

1. **Unit tests**: Test individual methods and functions
2. **Integration tests**: Test agent workflows end-to-end  
3. **Mock verification**: Ensure mocks are used correctly
4. **Coverage**: Aim for high test coverage within the agent

### Performance

1. **Lazy loading**: Only import what you need
2. **Mock efficiency**: Use lightweight mocks for better test performance
3. **Hot reload**: Take advantage of fast restart for rapid iteration
4. **Build optimization**: Use incremental TypeScript compilation

## Troubleshooting

### Common Issues

**TypeScript errors about missing modules**:
- Ensure `tsconfig.json` has correct path mappings
- Check that `extends` points to the correct base configuration
- Verify include/exclude patterns are correct

**Tests failing with import errors**:
- Check Jest configuration has correct module mapping
- Ensure mock files exist in `__mocks__/` directory
- Verify `jest.setup.js` is loading properly

**VS Code not showing proper IntelliSense**:
- Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")
- Check TypeScript version in status bar
- Ensure workspace is opened at agent level, not root

**Mock services not working**:
- Verify mock files exist in `__mocks__/shared/` directory
- Check Jest setup file is properly configured
- Ensure environment variables point to mock endpoints

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set environment variable for detailed logs
JEST_VERBOSE=true npm run test:isolated

# Enable debug output
DEBUG=* npm run dev:isolated
```

### Reset Environment

If development environment becomes corrupted:

```bash
# Clean and reset
npm run clean
rm -rf node_modules dist coverage
npm install
npm run dev:setup <agent-name>
```

## Advanced Configuration

### Custom Mock Services

Create custom mocks for specific agent needs:

```typescript
// __mocks__/shared/custom/MyService.ts
export class MyService {
  async customMethod(input: string) {
    return `Mock response for ${input}`;
  }
}
```

### Environment-specific Configuration

```typescript
// Load different configs based on environment
const config = process.env.NODE_ENV === 'test' 
  ? require('./config.test.json')
  : require('./config.dev.json');
```

### Multi-agent Dependencies

For agencies that need individual agents:

```typescript
// In agency tsconfig.json, include individual agents
{
  "include": [
    "./**/*.ts",
    "../../../core/**/*.ts", 
    "../../../shared/**/*.ts",
    "../../../individual/**/*.ts"
  ]
}
```

## Integration with Main System

### Deploying Changes

After isolated development, integrate back to main system:

1. **Test integration**: Run full test suite from backend root
2. **Type check**: Ensure no TypeScript errors in main project
3. **Build verification**: Confirm agent builds correctly with main system
4. **End-to-end testing**: Test agent within orchestrator

### Production Considerations

- Remove development-only files (`.env.local`, `__mocks__/`)
- Ensure proper error handling for missing services
- Verify configuration works in production environment
- Test with real (not mocked) shared services

This isolation framework enables efficient, focused development while maintaining system integrity and preventing conflicts between agents.