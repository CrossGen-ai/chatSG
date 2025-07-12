# Azure Gateway SSL Termination Architecture

## Overview

ChatSG is deployed in Azure GCC High with SSL termination at the gateway level. This document explains the architecture and configuration requirements.

## Network Architecture

```
[Client Browser]
       |
       | HTTPS (443)
       ↓
[Azure Application Gateway]
  - Public IP: 51.54.96.228
  - SSL Certificate installed
  - Performs SSL termination
       |
       | HTTP (3000)
       | + X-Forwarded headers
       ↓
[Internal VM: 10.2.0.54]
  - Node.js app on port 3000
  - No SSL certificate needed
  - Trusts proxy headers
```

## How SSL Termination Works

1. **Client connects via HTTPS**
   - Browser connects to https://51.54.96.228
   - Azure Gateway handles SSL/TLS negotiation

2. **Gateway forwards to backend**
   - Strips SSL and forwards plain HTTP to internal VM
   - Adds headers to indicate original connection was HTTPS:
     - `X-Forwarded-Proto: https`
     - `X-Forwarded-For: <original-client-ip>`
     - `X-Original-Host: 51.54.96.228`

3. **Backend processes request**
   - Node.js app receives HTTP request
   - Detects HTTPS via X-Forwarded-Proto header
   - Sets secure cookies that work over HTTPS

## Configuration Requirements

### Azure Gateway Configuration
- Must forward these headers:
  - `X-Forwarded-Proto`
  - `X-Forwarded-For`
  - `X-Original-Host` (optional)

### Node.js Application Configuration
```javascript
// Trust proxy headers in production
proxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production'
```

### Environment Variables
```bash
# Required for SSL termination setup
TRUST_PROXY=true
NODE_ENV=production
SESSION_SECURE=true
COOKIE_DOMAIN=51.54.96.228
```

## Cookie Configuration

With SSL termination, cookies must be configured correctly:

```javascript
cookie: {
  secure: true,          // Required for HTTPS
  httpOnly: true,        // Security: not accessible via JS
  sameSite: 'none',      // Required for cross-origin in some cases
  domain: '51.54.96.228' // Must match the public domain
}
```

## Troubleshooting SSL Termination

### Test proxy header detection:
```bash
curl -k https://51.54.96.228/api/auth/test-config | jq '.proxy'
```

Expected output:
```json
{
  "trustProxy": true,
  "detectedProtocol": "https",
  "xForwardedProto": "https",
  "xForwardedFor": "your-ip",
  "connectionEncrypted": true
}
```

### Common Issues

1. **Cookies not being set**
   - Check: `TRUST_PROXY=true`
   - Verify: X-Forwarded-Proto header is present

2. **Session not persisting**
   - Ensure: `SESSION_SECURE=true`
   - Check: Cookie domain matches public IP/domain

3. **CORS errors**
   - Frontend URL must be configured correctly
   - Access-Control headers must allow credentials

## Security Benefits

1. **Centralized SSL management** - Certificates only on gateway
2. **Internal traffic simplified** - No SSL between gateway and VM
3. **Performance** - SSL termination offloaded from application
4. **Flexibility** - Can update certificates without touching app

## Azure-Specific Considerations

- GCC High uses different endpoints (*.us domains)
- Ensure firewall rules allow gateway → VM communication
- Health probes from gateway use HTTP, not HTTPS