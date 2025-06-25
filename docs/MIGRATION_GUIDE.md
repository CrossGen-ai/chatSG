# Migration Guide: Legacy Agents to Modular Structure

> **⚠️ IMPORTANT UPDATE**: AgentZero workflow has been removed from the system as of the latest version. All requests now route through the orchestration system for better performance and consistency. This guide remains for historical reference and for migrating AgentRouter usage patterns.

This guide helps you migrate from the legacy agent system to the new modular structure while maintaining full backward compatibility.

## Table of Contents

- [Overview](#overview)
- [Backward Compatibility](#backward-compatibility)
- [Migration Strategies](#migration-strategies)
- [Step-by-Step Migration](#step-by-step-migration)
- [Breaking Changes](#breaking-changes)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

### What Changed

The ChatSG backend has been refactored from a flat agent structure to a modular, folder-based architecture:

**Old Structure:**
```
backend/
├── agent/
│   ├── AgentZero/
│   │   └── agent.js
│   └── AgentRouter/
│       └── agent.js
└── server.js
```

**New Structure:**
```
backend/
├── src/agents/
│   ├── core/           # BaseAgent, AgentFactory, AgentRegistry
│   ├── individual/     # Self-contained individual agents
│   ├── agencies/       # Multi-agent LangGraph workflows
│   ├── shared/         # Shared tools, memory, UI components
│   └── wrappers/       # Legacy compatibility wrappers
└── server.js
```

### Migration Benefits

- **Type Safety**: Full TypeScript support with proper interfaces
- **Modularity**: Isolated agent development and testing
- **Consistency**: Unified agent interface via BaseAgent
- **Extensibility**: Easy to add new agents and agencies
- **Testing**: Better test isolation and mocking
- **Development**: Context isolation for focused development

## Backward Compatibility

### 🛡️ Zero Breaking Changes

**Your existing code continues to work without modification.** The migration provides:

- Legacy import compatibility
- API preservation
- Response format compatibility
- Session management compatibility
- Configuration compatibility

### Compatibility Layer

The system provides automatic compatibility through:

1. **Legacy Wrappers**: Existing imports are redirected to compatibility wrappers
2. **API Translation**: Old response formats are automatically converted
3. **Deprecation Warnings**: Helpful guidance for future migration
4. **Gradual Migration**: You can migrate components one at a time

## Migration Strategies

### Strategy 1: Keep Using Legacy (Recommended for Stable Systems)

If your system is stable and you don't need new features:

```javascript
// This continues to work exactly as before
const AgentZero = require('./agent/AgentZero/agent');
const AgentRouter = require('./agent/AgentRouter/agent');

const agent = new AgentZero();
const result = await agent.processMessage('Hello', 'session-123');
```

**Pros:**
- Zero changes required
- No risk of breaking existing functionality
- Immediate benefits from improved underlying system

**Cons:**
- Missing out on new TypeScript features
- Deprecation warnings in logs
- Limited access to new agent types

### Strategy 2: Gradual Migration (Recommended for Active Development)

Migrate components gradually while maintaining compatibility:

```javascript
// Step 1: Keep using legacy imports but start using factory for new code
const AgentZero = require('./agent/AgentZero/agent'); // Legacy
const { AgentFactory } = require('./dist/src/agents/core/AgentFactory'); // New

// Step 2: Gradually replace with factory pattern
const factory = AgentFactory.getInstance();
const analyticalAgent = await factory.createAgent('AnalyticalAgent');
```

### Strategy 3: Full Migration (Recommended for New Features)

Completely migrate to the new system for maximum benefits:

```typescript
// TypeScript with full type safety
import { AgentFactory } from './src/agents/core/AgentFactory';
import { BaseAgent } from './src/agents/core/BaseAgent';

const factory = AgentFactory.getInstance();
const agent: BaseAgent = await factory.createAgent('AgentZero');
const result = await agent.processMessage('Hello', 'session-123');
```

## Step-by-Step Migration

### Phase 1: Preparation (No Code Changes)

1. **Build the new system:**
   ```bash
   cd backend
   npm run build
   ```

2. **Run tests to ensure compatibility:**
   ```bash
   npm test
   ```

3. **Review deprecation warnings** in your logs to understand usage patterns

### Phase 2: Server Migration (Optional)

Update your server.js to use the new factory pattern:

**Before:**
```javascript
const AgentZero = require('./agent/AgentZero/agent');
const agentZero = new AgentZero();
```

**After:**
```javascript
const { createServerShim } = require('./dist/src/agents/wrappers/LegacyAgentWrapper');
const shim = createServerShim();
const agentZero = await shim.createAgentZero();
```

### Phase 3: Test Migration (Recommended)

Update test files to use the new system:

**Before:**
```javascript
const AgentZero = require('../agent/AgentZero/agent');
const agent = new AgentZero();
```

**After:**
```javascript
const { AgentFactory } = require('../dist/src/agents/core/AgentFactory');
const factory = AgentFactory.getInstance();
const agent = await factory.createAgent('AgentZero');
```

### Phase 4: Application Migration (When Ready)

Migrate your application code to use TypeScript and the new interfaces:

**Before:**
```javascript
const AgentZero = require('./agent/AgentZero/agent');
const agent = new AgentZero();

async function processUserInput(input, sessionId) {
    const result = await agent.processMessage(input, sessionId);
    return {
        message: result.response,
        timestamp: result.timestamp
    };
}
```

**After:**
```typescript
import { AgentFactory } from './src/agents/core/AgentFactory';
import { BaseAgent, AgentResponse } from './src/agents/core/BaseAgent';

const factory = AgentFactory.getInstance();
const agent: BaseAgent = await factory.createAgent('AgentZero');

async function processUserInput(input: string, sessionId: string): Promise<AgentResponse> {
    return await agent.processMessage(input, sessionId);
}
```

## Breaking Changes

### None for Legacy Usage

There are **no breaking changes** if you continue using the legacy import pattern. The compatibility layer ensures 100% API compatibility.

### Potential Changes for Advanced Usage

If you were accessing internal properties or methods:

1. **Internal property access**: Some internal properties may not be available through wrappers
2. **Direct file system access**: Avoid directly accessing agent files; use the factory instead
3. **Custom modifications**: If you modified agent files directly, those changes need to be ported

## Troubleshooting

### Common Issues

**Issue: "Cannot find module" errors**
```
Error: Cannot find module './dist/src/agents/wrappers/LegacyAgentWrapper'
```

**Solution:** Build the TypeScript code:
```bash
cd backend
npm run build
```

**Issue: Deprecation warnings in logs**
```
[DEPRECATION WARNING] Direct AgentZero import is deprecated.
```

**Solution:** This is informational. Your code still works. Consider migrating when convenient.

**Issue: TypeScript errors in JavaScript files**
```
TypeError: Cannot read property 'createAgent' of undefined
```

**Solution:** Ensure you're importing from the compiled JavaScript files in `dist/`:
```javascript
// Correct
const { AgentFactory } = require('./dist/src/agents/core/AgentFactory');

// Incorrect
const { AgentFactory } = require('./src/agents/core/AgentFactory');
```

### Debug Mode

Enable debug logging to troubleshoot migration issues:

```bash
DEBUG=agent:* node server.js
```

### Testing Migration

Create a test script to verify your migration:

```javascript
// test-migration.js
const { AgentFactory } = require('./dist/src/agents/core/AgentFactory');

async function testMigration() {
    console.log('Testing migration...');
    
    try {
        const factory = AgentFactory.getInstance();
        console.log('✓ Factory initialized');
        
        const agentZero = await factory.createAgent('AgentZero');
        console.log('✓ AgentZero created');
        
        const result = await agentZero.processMessage('test', 'test-session');
        console.log('✓ Message processed:', result.success);
        
        console.log('Migration test successful!');
    } catch (error) {
        console.error('Migration test failed:', error);
    }
}

testMigration();
```

## Best Practices

### During Migration

1. **Test thoroughly**: Run your existing test suite after each migration step
2. **Migrate gradually**: Don't try to migrate everything at once
3. **Keep backups**: Ensure you can rollback if needed
4. **Monitor logs**: Watch for deprecation warnings and errors
5. **Use TypeScript**: Take advantage of type safety for new code

### Post-Migration

1. **Remove legacy imports**: Once fully migrated, remove old require statements
2. **Update documentation**: Document your new agent usage patterns
3. **Create new agents**: Use the new modular structure for new functionality
4. **Leverage isolation**: Use the context isolation features for development

### New Development

For new agent development, use the modern patterns:

```typescript
// Create new individual agent
import { AbstractBaseAgent } from './src/agents/core/BaseAgent';

export class MyNewAgent extends AbstractBaseAgent {
    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        // Your implementation
    }
}
```

```typescript
// Create new agency workflow
import { StateGraph, Annotation } from '@langchain/langgraph';
import { AbstractBaseAgent } from './src/agents/core/BaseAgent';

export class MyAgency extends AbstractBaseAgent {
    // LangGraph workflow implementation
}
```

## Migration Timeline

### Immediate (Phase 0)
- ✅ Backward compatibility active
- ✅ Legacy code continues working
- ✅ Deprecation warnings provide guidance

### Short Term (1-2 weeks)
- 🔄 Migrate test files (optional)
- 🔄 Update server.js (optional)
- 🔄 Start using factory for new code

### Medium Term (1-2 months)
- 🔄 Migrate application code gradually
- 🔄 Add TypeScript types
- 🔄 Leverage new agent types

### Long Term (3-6 months)
- 🎯 Full TypeScript migration
- 🎯 Remove legacy compatibility layer
- 🎯 Use advanced features (agencies, isolation)

## Support

### Getting Help

1. **Check logs**: Deprecation warnings provide specific guidance
2. **Review examples**: See `docs/AGENT_DEVELOPMENT_GUIDE.md` for examples
3. **Test incrementally**: Use the test script above to verify each step
4. **Rollback if needed**: Keep your original code until migration is complete

### Migration Checklist

- [ ] Built TypeScript code (`npm run build`)
- [ ] Verified existing functionality works
- [ ] Reviewed deprecation warnings
- [ ] Created migration test script
- [ ] Updated server.js (if desired)
- [ ] Migrated test files (if desired)
- [ ] Updated application imports (gradually)
- [ ] Added TypeScript types (when ready)
- [ ] Removed legacy imports (final step)

The migration is designed to be safe, gradual, and non-breaking. Take your time and migrate at a pace that works for your project.