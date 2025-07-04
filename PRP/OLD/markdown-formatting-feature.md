name: "Markdown Formatting Feature for ChatSG"
description: |
  Real-time markdown rendering in chat bubbles with progressive updates during streaming

## Goal
Implement real-time markdown formatting in chat bubbles that progressively renders markdown as it streams, updating the visual formatting when markdown tags are completed (e.g., when a closing ** for bold is received). For static messages, markdown should be rendered immediately upon display. Additionally, implement a comprehensive security middleware layer following defense-in-depth principles to protect against XSS, CSRF, injection attacks, and prepare for future user authentication.

## Why
- **Enhanced readability**: Users can see formatted text (bold, italics, headers) making conversations more scannable
- **Better code display**: Properly formatted code blocks and inline code improve technical discussions
- **Progressive enhancement**: Seeing formatting appear during streaming provides better visual feedback
- **Consistency**: Matches user expectations from other markdown-enabled chat applications
- **Security hardening**: Defense-in-depth approach protects against common web vulnerabilities (XSS, CSRF, injection)
- **Future-ready authentication**: Middleware architecture makes it easy to add user auth and additional security layers
- **Compliance ready**: Following 2025 security best practices for data protection regulations

## What
### User-visible behavior
1. **During streaming**: Text updates with markdown formatting as closing tags are received
   - Example: "This is **bold" appears as plain text until the closing ** arrives, then renders as bold
2. **Static messages**: All markdown is pre-rendered when messages load
3. **Supported formats**: Bold, italic, headers, code blocks, inline code, links, lists, blockquotes
4. **Theme consistency**: Markdown styling follows the app's light/dark theme

### Technical requirements
- Progressive markdown parser that can handle incomplete markdown during streaming
- Configuration file for markdown theme settings
- Performance optimization to avoid re-parsing entire messages
- Maintain existing chat bubble structure and styling
- Security middleware layer with multiple defense mechanisms
- Extensible security architecture for future enhancements
- Request validation and sanitization pipeline
- Security headers and CSRF protection

### Success Criteria
- [X] Markdown renders correctly during streaming (progressive updates)
- [X] Static messages display with full markdown formatting
- [X] No performance degradation during streaming
- [X] Configuration allows customization of markdown styles
- [X] All basic markdown formats are supported
- [X] Theme consistency maintained (light/dark modes)
- [X] Security middleware blocks XSS attempts
- [X] CSRF tokens validate properly
- [X] Input sanitization prevents injection attacks
- [X] Security headers are properly set
- [X] Rate limiting prevents abuse
- [X] Security layer is extensible for future auth

## All Needed Context

### Documentation & References
```yaml
# Markdown Parsing
- url: https://github.com/remarkjs/react-markdown
  why: Popular React markdown parser we should evaluate
  
- url: https://marked.js.org/
  why: Fast markdown parser that supports streaming/progressive parsing

- doc: https://commonmark.org/
  section: Specification
  critical: Standard markdown spec to ensure compatibility

# Security Middleware
- url: https://helmetjs.github.io/
  why: Helmet.js for security headers (CSP, HSTS, X-Frame-Options, etc.)
  
- url: https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Nodejs_Security_Cheat_Sheet.md
  why: OWASP Node.js security best practices for 2025
  
- url: https://express-rate-limit.github.io/
  why: Rate limiting middleware to prevent DoS attacks
  
- url: https://github.com/cure53/DOMPurify
  why: XSS sanitization library for markdown content

# Code References  
- file: frontend/src/components/MessageItem.tsx
  why: Current message rendering component that needs markdown integration
  
- file: frontend/src/components/ChatUI.tsx
  why: Streaming logic where progressive markdown parsing will be integrated
  
- file: backend/config/storage.config.ts
  why: Example of existing configuration pattern to follow

- file: backend/server.js
  why: Main server where security middleware will be integrated
```

### Current Codebase Structure
```bash
frontend/src/
├── components/
│   ├── MessageItem.tsx          # Message display component
│   ├── ChatUI.tsx              # Main chat UI with streaming
│   └── StatusMessage.tsx       # Status message component
├── hooks/
│   └── useChatManager.tsx      # Chat state management
└── index.css                   # Global styles

backend/
├── config/
│   ├── storage.config.ts       # Example config pattern
│   └── slash-commands.json     # Example JSON config
└── server.js                   # Main server
```

### Desired Codebase Structure
```bash
frontend/src/
├── components/
│   ├── MessageItem.tsx          # [MODIFIED] Integrate markdown rendering
│   ├── ChatUI.tsx              # [MODIFIED] Progressive markdown during streaming
│   └── MarkdownRenderer.tsx    # [NEW] Markdown rendering component
├── utils/
│   ├── markdownParser.ts       # [NEW] Progressive markdown parser
│   └── sanitizer.ts            # [NEW] XSS sanitization utilities
├── security/
│   └── ContentValidator.ts     # [NEW] Frontend content validation
└── index.css                   # [MODIFIED] Add markdown styles

backend/
├── middleware/
│   ├── security/
│   │   ├── index.js           # [NEW] Main security middleware orchestrator
│   │   ├── helmet.js          # [NEW] Security headers configuration
│   │   ├── rateLimiter.js     # [NEW] Rate limiting configuration
│   │   ├── validator.js       # [NEW] Input validation middleware
│   │   ├── sanitizer.js       # [NEW] Input sanitization middleware
│   │   ├── csrf.js            # [NEW] CSRF protection middleware
│   │   └── auth.js            # [NEW] Auth middleware stub for future
│   └── errorHandler.js        # [NEW] Centralized error handling
├── config/
│   ├── security.config.js     # [NEW] Security configuration
│   ├── markdown.config.json   # [NEW] Markdown theme configuration
│   └── markdown.config.schema.json # [NEW] Config schema for validation
└── server.js                  # [MODIFIED] Integrate security middleware
```

### Known Gotchas & Considerations
```typescript
// CRITICAL: React re-rendering during streaming
// - Must use memo/callbacks to prevent full re-parse on each token
// - Consider using a ref to accumulate unparsed content

// CRITICAL: XSS Prevention - MULTIPLE LAYERS
// - Frontend: DOMPurify sanitization before rendering
// - Backend: Input validation and sanitization middleware
// - CSP headers to prevent inline script execution
// - Markdown parsers must sanitize HTML
// - Links should use rel="noopener noreferrer"

// SECURITY: Defense in Depth
// - Each layer validates independently (don't trust other layers)
// - Fail closed - deny by default
// - Log security events for monitoring
// - Rate limit by IP and session

// PERFORMANCE: Large messages
// - Don't re-parse entire message on each streaming update
// - Parse only the new content since last update
// - Security checks should be async where possible

// STREAMING: Incomplete markdown
// - Parser must handle unclosed tags gracefully
// - Should not throw errors on partial markdown

// CSRF: Protection Strategy
// - Double submit cookie pattern (more reliable than csurf)
// - SameSite cookie attributes
// - Origin validation

// NODE.JS 2025: Security Updates
// - Keep Node.js updated (security releases Jan 21 & May 14, 2025)
// - Monitor for high severity vulnerabilities in v23.x, v24.x
```

## Implementation Blueprint

### Data Models and Configuration

```javascript
// backend/config/security.config.js
module.exports = {
  // Helmet.js configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For markdown styles
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // CSRF protection
  csrf: {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  },
  
  // Input validation
  validation: {
    maxMessageLength: 10000,
    maxSessionIdLength: 100,
    allowedMessageTypes: ['user', 'assistant'],
    sanitizeOptions: {
      allowedTags: [], // No HTML in messages
      allowedAttributes: {},
      textFilter: (text) => text.trim()
    }
  },
  
  // Future auth placeholder
  auth: {
    enabled: false, // Will be enabled when auth is implemented
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    requireAuth: false // Will be true when auth is implemented
  }
};

// backend/config/markdown.config.json structure
{
  "enabled": true,
  "security": {
    "sanitize": true,
    "allowedTags": ["b", "i", "em", "strong", "a", "p", "code", "pre", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "br", "hr", "span"],
    "allowedAttributes": {
      "a": ["href", "title"],
      "code": ["class"],
      "span": ["class"]
    },
    "allowedSchemes": ["http", "https", "mailto"],
    "forceProtocol": true
  },
  "theme": {
    "bold": {
      "fontWeight": "600",
      "color": "inherit"
    },
    "italic": {
      "fontStyle": "italic"
    },
    "h1": {
      "fontSize": "1.5em",
      "fontWeight": "700",
      "marginTop": "1em",
      "marginBottom": "0.5em"
    },
    "code": {
      "backgroundColor": "rgba(0, 0, 0, 0.05)",
      "padding": "0.2em 0.4em",
      "borderRadius": "3px",
      "fontFamily": "monospace"
    },
    "codeBlock": {
      "backgroundColor": "rgba(0, 0, 0, 0.05)",
      "padding": "1em",
      "borderRadius": "5px",
      "overflowX": "auto"
    },
    "link": {
      "color": "#0066cc",
      "textDecoration": "underline"
    }
  },
  "darkThemeOverrides": {
    "code": {
      "backgroundColor": "rgba(255, 255, 255, 0.1)"
    },
    "codeBlock": {
      "backgroundColor": "rgba(255, 255, 255, 0.05)"
    },
    "link": {
      "color": "#66b3ff"
    }
  },
  "supportedElements": [
    "bold", "italic", "h1", "h2", "h3", 
    "code", "codeBlock", "link", "list", 
    "blockquote", "strikethrough"
  ]
}
```

### Task List

```yaml
# Security Middleware Implementation (Priority 1)
Task 1: Create Security Configuration
CREATE backend/config/security.config.js:
  - Define Helmet.js configuration with CSP
  - Configure rate limiting settings
  - Set up CSRF protection options
  - Add validation rules
  - Create auth placeholder structure

Task 2: Implement Core Security Middleware
CREATE backend/middleware/security/index.js:
  - Main security orchestrator
  - Load all security middleware in correct order
  - Export configurable middleware function

CREATE backend/middleware/security/helmet.js:
  - Configure Helmet with security headers
  - Set up CSP for markdown content
  - Configure HSTS, X-Frame-Options, etc.

CREATE backend/middleware/security/rateLimiter.js:
  - Implement express-rate-limit
  - Configure per-IP and per-session limits
  - Add custom key generator for future auth

Task 3: Input Validation and Sanitization
CREATE backend/middleware/security/validator.js:
  - Implement express-validator rules
  - Validate message structure and types
  - Check sessionId format and length
  - Validate markdown content length

CREATE backend/middleware/security/sanitizer.js:
  - Implement DOMPurify for backend
  - Strip dangerous HTML/scripts
  - Clean markdown input before processing

Task 4: CSRF Protection
CREATE backend/middleware/security/csrf.js:
  - Implement double submit cookie pattern
  - Add origin validation
  - Generate and validate CSRF tokens
  - Handle token refresh

Task 5: Auth Middleware Stub
CREATE backend/middleware/security/auth.js:
  - Create extensible auth middleware structure
  - Add placeholder for future JWT validation
  - Implement session management hooks
  - Add user context injection point

Task 6: Error Handling
CREATE backend/middleware/errorHandler.js:
  - Centralized error handling
  - Security error logging
  - Safe error messages (no stack traces in prod)
  - Rate limit error responses

Task 7: Integrate Security into Server
MODIFY backend/server.js:
  - Import security middleware
  - Apply middleware in correct order
  - Add security config loading
  - Update CORS settings

# Frontend Security Implementation
Task 8: Frontend Sanitization
CREATE frontend/src/utils/sanitizer.ts:
  - DOMPurify wrapper for React
  - Markdown-specific sanitization
  - Link validation utilities

CREATE frontend/src/security/ContentValidator.ts:
  - Client-side content validation
  - CSRF token management
  - Security event logging

# Markdown Implementation (Priority 2)
Task 9: Create Markdown Configuration
CREATE backend/config/markdown.config.json:
  - Define default markdown theme settings
  - Include security sanitization rules
  - Include dark theme overrides
  - List supported markdown elements

CREATE backend/config/markdown.config.schema.json:
  - JSON schema for validation
  - Ensure type safety for config

Task 10: Build Progressive Markdown Parser
CREATE frontend/src/utils/markdownParser.ts:
  - Implement streaming-aware parser
  - Integrate with sanitizer
  - Handle incomplete markdown gracefully
  - Export parseMarkdownProgressive function
  - Export parseMarkdownComplete function

Task 11: Create Markdown Renderer Component
CREATE frontend/src/components/MarkdownRenderer.tsx:
  - Accept content and isStreaming props
  - Apply sanitization before rendering
  - Use React.memo for performance
  - Apply theme from configuration
  - Handle both progressive and complete parsing

Task 12: Integrate Markdown into MessageItem
MODIFY frontend/src/components/MessageItem.tsx:
  - Import MarkdownRenderer
  - Replace direct content rendering
  - Pass isStreaming prop correctly
  - Maintain existing styling structure

Task 13: Update Streaming Logic in ChatUI
MODIFY frontend/src/components/ChatUI.tsx:
  - Track last parsed position in streaming
  - Call progressive parser on new tokens
  - Trigger re-render only on completed tags
  - Clean up refs after streaming completes

Task 14: Add Markdown Styles
MODIFY frontend/src/index.css:
  - Add base markdown element styles
  - Include dark theme variations
  - Ensure proper specificity for chat bubbles
  - Add CSP-compliant styles

Task 15: Load Config in Frontend
CREATE frontend/src/api/config.ts:
  - Add endpoint to fetch markdown config
  - Add endpoint to fetch security config
  - Cache configuration
  - Handle config loading errors

MODIFY backend/server.js:
  - Add /api/config/markdown endpoint
  - Add /api/config/security endpoint
  - Apply security middleware to config endpoints

# Testing
Task 16: Security Tests
CREATE backend/tests/security/middleware.test.js:
  - Test XSS prevention
  - Test CSRF protection
  - Test rate limiting
  - Test input validation

CREATE frontend/src/security/ContentValidator.test.ts:
  - Test content sanitization
  - Test CSRF token handling

Task 17: Markdown Tests
CREATE frontend/src/components/MarkdownRenderer.test.tsx:
  - Test progressive parsing scenarios
  - Test complete markdown rendering
  - Test XSS prevention in markdown

CREATE frontend/src/utils/markdownParser.test.ts:
  - Unit tests for parser functions
  - Edge cases for incomplete markdown
  - Security bypass attempts
```

### Implementation Pseudocode

```javascript
// Task 2: Security Middleware Orchestrator
// backend/middleware/security/index.js
const helmet = require('./helmet');
const rateLimiter = require('./rateLimiter');
const validator = require('./validator');
const sanitizer = require('./sanitizer');
const csrf = require('./csrf');
const auth = require('./auth');
const config = require('../../config/security.config');

module.exports = function securityMiddleware(options = {}) {
  // PATTERN: Layered security - each middleware is independent
  const middlewares = [];
  
  // Layer 1: Security headers (always first)
  middlewares.push(helmet(config.helmet));
  
  // Layer 2: Rate limiting (prevent DoS)
  if (options.rateLimit !== false) {
    middlewares.push(rateLimiter(config.rateLimit));
  }
  
  // Layer 3: CSRF protection
  if (options.csrf !== false) {
    middlewares.push(csrf.initialize(config.csrf));
    middlewares.push(csrf.verify);
  }
  
  // Layer 4: Input validation
  middlewares.push(validator.validateRequest);
  
  // Layer 5: Input sanitization
  middlewares.push(sanitizer.sanitizeInput);
  
  // Layer 6: Authentication (when enabled)
  if (config.auth.enabled) {
    middlewares.push(auth.authenticate);
    middlewares.push(auth.authorize);
  }
  
  // Return middleware chain
  return (req, res, next) => {
    // Execute middleware in sequence
    let index = 0;
    
    function executeNext(err) {
      if (err) return next(err);
      if (index >= middlewares.length) return next();
      
      const middleware = middlewares[index++];
      middleware(req, res, executeNext);
    }
    
    executeNext();
  };
};

// Task 3: Input Validator
// backend/middleware/security/validator.js
const { body, validationResult } = require('express-validator');
const config = require('../../config/security.config');

const validateChatMessage = [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: config.validation.maxMessageLength })
    .withMessage('Message must be between 1 and 10000 characters'),
  
  body('sessionId')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .isLength({ max: config.validation.maxSessionIdLength })
    .withMessage('Invalid session ID format'),
  
  body('activeSessionId')
    .optional()
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/),
    
  // CRITICAL: Fail fast on validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Task 10: Progressive Markdown Parser
// frontend/src/utils/markdownParser.ts
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface ParseResult {
  html: string;
  lastCompletePosition: number;
  pendingMarkdown: string;
}

// Configure marked for security
marked.setOptions({
  headerIds: false, // Prevent ID injection
  mangle: false, // Don't obfuscate email addresses
  sanitize: false, // We'll use DOMPurify instead
});

export function parseMarkdownProgressive(
  content: string, 
  lastPosition: number = 0,
  config: any
): ParseResult {
  // PATTERN: Only parse new content since last position
  const newContent = content.slice(lastPosition);
  
  // CRITICAL: Identify complete markdown elements
  const completeElements = findCompleteMarkdownElements(newContent);
  
  // GOTCHA: Don't parse incomplete elements
  let parsedHtml = '';
  let currentPos = lastPosition;
  
  for (const element of completeElements) {
    // Parse markdown to HTML
    const rawHtml = marked.parse(element.text);
    
    // SECURITY: Sanitize with DOMPurify
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: config.security.allowedTags,
      ALLOWED_ATTR: config.security.allowedAttributes,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
    
    parsedHtml += cleanHtml;
    currentPos += element.length;
  }
  
  // Return pending markdown that's incomplete
  const pendingMarkdown = content.slice(currentPos);
  
  return {
    html: parsedHtml,
    lastCompletePosition: currentPos,
    pendingMarkdown
  };
}

// Helper to find complete markdown elements
function findCompleteMarkdownElements(text: string): Array<{text: string, length: number}> {
  const elements = [];
  const patterns = [
    // Bold: **text** or __text__
    /(\*\*[^*]+\*\*|__[^_]+__)/,
    // Italic: *text* or _text_
    /(\*[^*\n]+\*|_[^_\n]+_)(?![*_])/,
    // Code: `code`
    /`[^`\n]+`/,
    // Headers: # text\n
    /^#{1,6}\s+[^\n]+\n/m,
    // Links: [text](url)
    /\[[^\]]+\]\([^)]+\)/,
  ];
  
  // Find complete patterns
  let remainingText = text;
  let position = 0;
  
  while (remainingText.length > 0) {
    let found = false;
    
    for (const pattern of patterns) {
      const match = remainingText.match(pattern);
      if (match && match.index === 0) {
        elements.push({
          text: match[0],
          length: match[0].length
        });
        remainingText = remainingText.slice(match[0].length);
        position += match[0].length;
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Check for plain text before next markdown
      const nextMarkdown = remainingText.search(/[*_`#\[]/);
      if (nextMarkdown > 0) {
        elements.push({
          text: remainingText.slice(0, nextMarkdown),
          length: nextMarkdown
        });
        remainingText = remainingText.slice(nextMarkdown);
        position += nextMarkdown;
      } else {
        break; // No more complete elements
      }
    }
  }
  
  return elements;
}
```

### Integration Points
```yaml
FRONTEND:
  - MessageItem.tsx: Replace content rendering with MarkdownRenderer
  - ChatUI.tsx: Add streaming state tracking for progressive parsing
  - App.tsx: Load markdown and security config on init
  - api/chat.ts: Add CSRF token to requests
  
BACKEND:
  - server.js: Apply security middleware before all routes
  - server.js: Add config endpoints (/api/config/markdown, /api/config/security)
  - All API routes: Protected by validation and sanitization
  - SSE endpoints: Special handling for streaming security
  
STYLES:
  - index.css: Add markdown element styles
  - Ensure CSP-compliant inline styles
  - Theme variable usage for light/dark modes

SECURITY FLOW:
  1. Request → Helmet (headers) → Rate Limiter → CSRF Check → Validation → Sanitization → Route Handler
  2. Response → Error Handler → Security Headers → Client
  3. Frontend → Sanitize Content → Render Markdown → Display
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# TypeScript compilation
npm run build --prefix frontend

# Linting
npm run lint --prefix frontend

# Expected: No errors
```

### Level 2: Unit Tests
```typescript
// Test progressive parsing
describe('parseMarkdownProgressive', () => {
  it('handles incomplete bold markdown', () => {
    const result = parseMarkdownProgressive('Hello **world');
    expect(result.pendingMarkdown).toBe('**world');
    expect(result.html).toBe('Hello ');
  });
  
  it('completes bold when closing tag arrives', () => {
    const result = parseMarkdownProgressive('Hello **world**');
    expect(result.html).toContain('<strong>world</strong>');
    expect(result.pendingMarkdown).toBe('');
  });
});

// Test XSS prevention
describe('MarkdownRenderer', () => {
  it('sanitizes malicious scripts', () => {
    const { container } = render(
      <MarkdownRenderer content="<script>alert('xss')</script>" />
    );
    expect(container.innerHTML).not.toContain('<script>');
  });
});
```

### Level 3: Integration Test
```bash
# Start the app
npm run dev

# Test streaming with markdown
# 1. Send a message with markdown
# 2. Observe progressive formatting during stream
# 3. Verify final rendered state

# Test static messages
# 1. Load existing chat with markdown
# 2. Verify immediate rendering
```

## Final Validation Checklist

### Security Validation
- [ ] Helmet headers are properly set (check with securityheaders.com)
- [ ] Rate limiting blocks excessive requests
- [ ] CSRF tokens are validated on state-changing requests
- [ ] XSS payloads are blocked at multiple layers
- [ ] Input validation rejects malformed data
- [ ] Error messages don't leak sensitive info
- [ ] Security events are logged properly
- [ ] Auth middleware is ready for future integration

### Markdown Validation
- [ ] Markdown renders progressively during streaming
- [ ] No performance degradation (measure render time)
- [ ] XSS attacks are prevented in markdown
- [ ] Configuration loads and applies correctly
- [ ] Dark theme markdown styles work
- [ ] All supported markdown elements render
- [ ] No console errors during streaming
- [ ] Existing chat functionality unchanged

### Integration Validation
- [ ] Security middleware doesn't break existing endpoints
- [ ] Streaming works with security layers
- [ ] Frontend handles validation errors gracefully
- [ ] CSRF tokens refresh properly
- [ ] Config endpoints are protected

## Anti-Patterns to Avoid

### Security Anti-Patterns
- ❌ Don't trust any layer completely (defense in depth)
- ❌ Don't skip validation because "frontend validated"
- ❌ Don't use deprecated security packages (e.g., csurf)
- ❌ Don't store sensitive data in localStorage
- ❌ Don't log sensitive information
- ❌ Don't use eval() or Function() constructor
- ❌ Don't disable security for "convenience"

### Markdown Anti-Patterns
- ❌ Don't re-parse entire message on each token
- ❌ Don't use innerHTML without sanitization
- ❌ Don't block streaming while parsing
- ❌ Don't create new markdown syntax
- ❌ Don't override existing message styles
- ❌ Don't parse markdown in the backend
- ❌ Don't allow arbitrary HTML in markdown

## Security Architecture Summary

The implementation follows a defense-in-depth approach with multiple independent layers:

1. **Network Layer**: Rate limiting, CORS policies
2. **HTTP Layer**: Security headers via Helmet
3. **Application Layer**: CSRF protection, input validation
4. **Data Layer**: Input sanitization, output encoding
5. **Presentation Layer**: Content Security Policy, XSS prevention

Each layer operates independently and doesn't trust the others, ensuring that a breach in one layer doesn't compromise the entire system. The architecture is designed to be extensible, allowing easy addition of user authentication and additional security measures in the future.