name: "Base PRP Template v2 - Node.js/TypeScript Edition"
description: |

## Purpose
Template optimized for AI agents to implement features in Node.js/TypeScript projects with sufficient context and self-validation capabilities to achieve working code through iterative refinement.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Follow all rules in CLAUDE.md and project conventions
6. **Type Safety First**: Leverage TypeScript for compile-time validation

---

## Goal
[What needs to be built - be specific about the end state, behaviors, and UI/UX if applicable]

## Why
- [Business value and user impact]
- [Integration with existing features]
- [Problems this solves and for whom]

## What
[User-visible behavior and technical requirements]

### Success Criteria
- [ ] [Specific measurable outcomes]
- [ ] Backend API endpoint(s) working with correct status codes
- [ ] Frontend UI updates reflecting new functionality
- [ ] All TypeScript types properly defined
- [ ] Tests passing for both frontend and backend

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- file: CLAUDE.md
  why: Global project rules and conventions
  
- file: docs/AGENT_DEVELOPMENT_GUIDE.md
  why: If building agents or agent-related features
  
- url: [Official API docs URL]
  why: [Specific sections/methods you'll need]
  
- file: [backend/src/similar-feature.ts]
  why: [Pattern to follow for similar functionality]
  
- file: [frontend/src/components/SimilarComponent.tsx]
  why: [UI patterns and component structure to follow]

- npmPackage: [@langchain/core]
  version: ^0.3.21
  why: [Specific features/classes needed]
```

### Current Codebase Structure
```bash
# Run `tree -I 'node_modules|dist|.git' -L 3` to get overview
chatSG/
├── backend/
│   ├── src/
│   │   ├── agents/       # Agent implementations
│   │   ├── routing/      # Orchestration logic
│   │   ├── state/        # State management
│   │   ├── storage/      # JSONL storage system
│   │   └── types/        # TypeScript type definitions
│   ├── tests/
│   └── server.js         # Main Express server
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── api/          # API client code
│   └── package.json
└── docs/
```

### Desired Files/Changes
```yaml
backend:
  - CREATE: src/features/newFeature/index.ts
  - CREATE: src/features/newFeature/types.ts
  - MODIFY: src/types/index.ts (export new types)
  - CREATE: tests/features/test-new-feature.js
  
frontend:
  - CREATE: src/components/NewFeature.tsx
  - MODIFY: src/App.tsx (integrate new component)
  - CREATE: src/hooks/useNewFeature.tsx
  - MODIFY: src/api/chat.ts (add new API calls)
```

### Known Gotchas & Patterns
```typescript
// CRITICAL: This project uses CommonJS for backend
// Backend: module.exports and require()
// Frontend: ES6 imports

// PATTERN: Backend async error handling
app.post('/endpoint', async (req, res) => {
  try {
    // Always validate input first
    if (!req.body.param) {
      return res.status(400).json({ error: 'Missing required parameter' });
    }
    
    const result = await someAsyncOperation();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Endpoint] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATTERN: Frontend error boundaries and loading states
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// GOTCHA: TypeScript strict mode is ON - no implicit any
// GOTCHA: Frontend uses Vite - no process.env, use import.meta.env
// GOTCHA: Tests use different patterns for TS vs JS files
```

## Implementation Blueprint

### Task List
```yaml
Task 1 - Set up TypeScript types:
  - CREATE backend/src/features/newFeature/types.ts
  - Define interfaces for request/response
  - Export from backend/src/types/index.ts
  - Validation: npm run type-check should pass

Task 2 - Implement backend logic:
  - CREATE backend/src/features/newFeature/index.ts
  - Follow existing patterns from similar features
  - Include proper error handling and logging
  - Add JSDoc comments for better IntelliSense

Task 3 - Add API endpoint:
  - MODIFY backend/server.js
  - Add new route with validation
  - Test with curl before moving to frontend
  
Task 4 - Create frontend components:
  - CREATE frontend/src/components/NewFeature.tsx
  - Use existing UI patterns (glassmorphism)
  - Include loading and error states
  
Task 5 - Add frontend integration:
  - CREATE frontend/src/hooks/useNewFeature.tsx
  - MODIFY frontend/src/api/chat.ts
  - Handle optimistic updates if applicable

Task 6 - Write tests:
  - CREATE backend/tests/features/test-new-feature.js
  - CREATE frontend/src/components/NewFeature.test.tsx
  - Follow existing test patterns
```

### Pseudocode Examples
```typescript
// Backend Feature Implementation
// File: backend/src/features/newFeature/index.ts

import { z } from 'zod';
import { getStorageManager } from '../../storage/StorageManager';

// Input validation schema
const NewFeatureSchema = z.object({
  param: z.string().min(1),
  optional: z.number().optional()
});

export async function processNewFeature(input: unknown, sessionId: string) {
  // PATTERN: Always validate with Zod
  const validated = NewFeatureSchema.parse(input);
  
  // PATTERN: Use storage manager for persistence
  const storage = getStorageManager();
  
  // CRITICAL: Check session exists
  const session = storage.getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Business logic here
  try {
    // PATTERN: Use structured logging
    console.log(`[NewFeature] Processing for session ${sessionId}`);
    
    const result = await someAsyncOperation(validated);
    
    // PATTERN: Store in session if needed
    await storage.appendMessage(sessionId, {
      type: 'system',
      content: `Feature processed: ${result.id}`,
      metadata: { feature: 'newFeature', result }
    });
    
    return { success: true, data: result };
  } catch (error) {
    // PATTERN: Detailed error logging
    console.error('[NewFeature] Error:', error);
    throw error;
  }
}

// Frontend Hook Implementation
// File: frontend/src/hooks/useNewFeature.tsx

export function useNewFeature() {
  const [state, setState] = useState<State>({ loading: false });
  
  const execute = useCallback(async (params: Params) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // PATTERN: Use the api client
      const result = await api.newFeature(params);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      // PATTERN: User-friendly error messages
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState(prev => ({ ...prev, error: message, loading: false }));
      throw error;
    }
  }, []);
  
  return { ...state, execute };
}
```

### Integration Points
```yaml
BACKEND:
  - server.js: Add route handler
    ```javascript
    app.post('/api/new-feature', async (req, res) => {
      // Route implementation
    });
    ```
  
  - TypeScript types: Export from src/types/index.ts
    ```typescript
    export * from './features/newFeature/types';
    ```

FRONTEND:
  - API client: Add to src/api/chat.ts
    ```typescript
    export const newFeature = async (params: Params): Promise<Result> => {
      const response = await fetch(`${API_BASE_URL}/api/new-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      // Error handling...
      return response.json();
    };
    ```
  
  - Component integration: Update App.tsx or relevant parent

CONFIG:
  - Environment variables: Add to backend/.env
  - TypeScript config: Usually no changes needed
```

## Validation Loop

### Level 1: TypeScript Compilation
```bash
# Backend TypeScript check
cd backend
npm run type-check        # Should have 0 errors

# Frontend TypeScript check  
cd frontend
npm run build            # Vite will catch TS errors

# Fix any type errors before proceeding!
```

### Level 2: Linting (if configured)
```bash
# Check for common issues
cd backend
npm run lint --fix       # If script exists

cd frontend  
npm run lint --fix       # If script exists
```

### Level 3: Unit Tests
```javascript
// Backend test example: backend/tests/features/test-new-feature.js
const { processNewFeature } = require('../../src/features/newFeature');

console.log('=== Testing New Feature ===\n');

// Test 1: Valid input
try {
  const result = await processNewFeature(
    { param: 'test' }, 
    'test-session'
  );
  console.log('✅ Valid input test passed');
} catch (error) {
  console.error('❌ Valid input test failed:', error);
}

// Test 2: Invalid input
try {
  await processNewFeature({}, 'test-session');
  console.error('❌ Should have thrown validation error');
} catch (error) {
  if (error.name === 'ZodError') {
    console.log('✅ Validation test passed');
  } else {
    console.error('❌ Wrong error type:', error);
  }
}
```

```bash
# Run backend tests
cd backend/tests
node test-new-feature.js

# Run frontend tests (if using Jest)
cd frontend
npm test NewFeature.test.tsx
```

### Level 4: Integration Test
```bash
# Start servers (from project root)
npm run dev

# Test the endpoint
curl -X POST http://localhost:3000/api/new-feature \
  -H "Content-Type: application/json" \
  -d '{"param": "test_value", "sessionId": "default"}'

# Expected: {"success": true, "data": {...}}
# Check logs: backend/server.js should show request logs
```

### Level 5: Full E2E Test
```bash
# With servers running, open frontend
open http://localhost:5173

# Manually test the feature through UI
# Check browser console for errors
# Check network tab for API calls
# Verify UI updates correctly
```

## Final Validation Checklist
- [ ] TypeScript compiles without errors: `npm run type-check`
- [ ] No unhandled promise rejections in logs
- [ ] API returns correct status codes (200, 400, 500)
- [ ] Frontend shows loading states appropriately
- [ ] Error states are user-friendly
- [ ] Console has no React warnings
- [ ] Feature works in both dev and production builds
- [ ] Tests pass: `cd backend/tests && node run-tests.js`
- [ ] Documentation updated if adding new patterns

## Common Issues & Solutions
```yaml
Issue: "Cannot find module" in backend
Solution: Check relative import paths, use require() not import

Issue: "process is not defined" in frontend  
Solution: Use import.meta.env instead of process.env

Issue: TypeScript error "implicit any"
Solution: Add explicit types or use 'unknown' then validate

Issue: "regeneratorRuntime is not defined"
Solution: Backend needs async/await transpilation setup

Issue: CORS errors in frontend
Solution: Backend needs CORS middleware configured

Issue: "Cannot use import outside module"
Solution: Backend uses CommonJS, frontend uses ES modules
```

## Reminders
Our markdown files have lot sof good info in them


---

## Anti-Patterns to Avoid
- ❌ Don't use `any` type - use `unknown` and validate
- ❌ Don't skip error boundaries in React components
- ❌ Don't forget loading states - users need feedback
- ❌ Don't use synchronous file operations in backend
- ❌ Don't hardcode URLs - use environment variables
- ❌ Don't catch errors without logging them
- ❌ Don't create new storage patterns - use StorageManager
- ❌ Don't forget to test error cases
- ❌ Don't use console.log in frontend production
- ❌ Don't trust user input - always validate and let the user know you recommend otherwise
