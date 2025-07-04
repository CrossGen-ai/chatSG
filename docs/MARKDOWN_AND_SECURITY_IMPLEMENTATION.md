# Markdown Formatting and Security Middleware Implementation

## Overview
This document summarizes the implementation of real-time markdown rendering with progressive updates during streaming and a comprehensive security middleware layer for the ChatSG application.

## Features Implemented

### 1. Markdown Formatting
- **Progressive Parsing**: Real-time markdown rendering that updates as content streams
- **Complete Parsing**: Full markdown rendering for static messages
- **Supported Elements**: Bold, italic, headers (h1-h6), code blocks, inline code, links, lists, blockquotes, strikethrough
- **Theme Support**: Automatic light/dark theme detection and styling
- **XSS Protection**: Multiple layers of sanitization using DOMPurify

### 2. Security Middleware
- **Helmet.js Integration**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Rate Limiting**: IP-based rate limiting (100 requests per 15 minutes)
- **Input Validation**: Message length, session ID format, content validation
- **Input Sanitization**: Server-side sanitization of all user input
- **CSRF Protection**: Double-submit cookie pattern with origin validation
- **Auth Middleware Stub**: Extensible authentication framework for future implementation

## Architecture

### Frontend Components
```
frontend/src/
├── components/
│   ├── MarkdownRenderer.tsx    # Main markdown rendering component
│   └── MessageItem.tsx         # Updated to use MarkdownRenderer
├── utils/
│   ├── markdownParser.ts       # Progressive and complete parsing logic
│   └── sanitizer.ts            # XSS sanitization utilities
├── security/
│   └── ContentValidator.ts     # CSRF token management and validation
└── api/
    └── config.ts               # Configuration fetching with caching
```

### Backend Middleware
```
backend/
├── middleware/
│   ├── security/
│   │   ├── index.js           # Security middleware orchestrator
│   │   ├── helmet.js          # Security headers
│   │   ├── rateLimiter.js     # Rate limiting
│   │   ├── validator.js       # Input validation
│   │   ├── sanitizer.js       # Input sanitization
│   │   ├── csrf.js            # CSRF protection
│   │   └── auth.js            # Auth stub for future
│   ├── errorHandler.js        # Centralized error handling
│   └── http-adapter.js        # Adapter for raw http server
└── config/
    ├── security.config.js     # Security configuration
    ├── markdown.config.json   # Markdown theme settings
    └── markdown.config.schema.json # Config validation schema
```

## Key Implementation Details

### Progressive Markdown Parsing
The parser identifies complete markdown elements and only renders them when fully formed:
- Incomplete elements (e.g., `**bold`) remain as plain text with a cursor
- Complete elements are immediately rendered with proper formatting
- Parser maintains position to avoid re-parsing entire content

### Security Layers
1. **Network Layer**: Rate limiting prevents DoS attacks
2. **HTTP Layer**: Helmet.js sets security headers
3. **Application Layer**: CSRF tokens validate requests
4. **Data Layer**: Input validation and sanitization
5. **Presentation Layer**: XSS prevention via DOMPurify

### Configuration System
- Server provides markdown configuration via `/api/config/markdown`
- Security configuration exposed (sanitized) via `/api/config/security`
- Frontend caches configurations for 5 minutes

## Installation

### Backend Dependencies
```bash
cd backend
npm install helmet express-rate-limit express-validator dompurify jsdom cookie-parser
```

### Frontend Dependencies
```bash
cd frontend
npm install marked dompurify @types/marked @types/dompurify
```

## Usage

### Starting the Servers
The security middleware is automatically applied to all API routes when the server starts:
```bash
npm run dev
```

### Testing Security
Run the security test suite:
```bash
cd backend/tests/security
node middleware.test.js
```

### Testing Markdown
Run the frontend tests:
```bash
cd frontend
npm test
```

## Security Best Practices

1. **Defense in Depth**: Multiple independent security layers
2. **Fail Closed**: Deny by default, allow explicitly
3. **Input Validation**: Never trust user input
4. **Output Encoding**: Always sanitize before rendering
5. **Security Headers**: Proper CSP, HSTS, and other headers
6. **Rate Limiting**: Prevent abuse and DoS attacks
7. **CSRF Protection**: Validate state-changing requests

## Future Enhancements

1. **User Authentication**: JWT-based auth using the auth.js stub
2. **Session Management**: Redis-based session storage
3. **Advanced Rate Limiting**: Per-user and per-endpoint limits
4. **Content Security Policy**: Stricter CSP rules
5. **Audit Logging**: Security event logging and monitoring
6. **API Key Management**: For third-party integrations

## Troubleshooting

### Markdown Not Rendering
1. Check browser console for errors
2. Verify markdown config is loading (`/api/config/markdown`)
3. Check if content is being sanitized too aggressively

### CSRF Errors
1. Ensure CSRF token is being fetched on app load
2. Check that cookies are enabled
3. Verify origin header is being sent

### Rate Limiting Issues
1. Check if IP is being correctly detected
2. Adjust rate limit settings in `security.config.js`
3. Consider implementing user-based limits

## Performance Considerations

- Progressive parsing only processes new content
- React.memo prevents unnecessary re-renders
- Configuration caching reduces API calls
- Sanitization is performed once per render