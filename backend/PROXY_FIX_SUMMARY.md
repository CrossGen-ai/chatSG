# Azure Gateway SSL Termination Fix

## Problem
Your setup has Azure Gateway doing SSL termination:
- External: https://51.54.96.228 (SSL)
- Internal: http://10.2.0.54:3000 (no SSL)

The Node.js app doesn't know it's behind HTTPS, so secure cookies aren't being set, breaking the OAuth flow.

## Solution Implemented

1. **Added proxy detection** to `middleware/http-adapter.js`:
   - Detects X-Forwarded-Proto header
   - Properly identifies HTTPS connections behind proxy

2. **Updated session configuration** in `server.js`:
   - Added `proxy: true` option to trust proxy headers
   - Mark connection as encrypted when behind HTTPS proxy

3. **Enhanced debugging** in test-config endpoint to show proxy info

## Deployment Steps

1. **Deploy the updated code**:
   ```powershell
   .\scripts\deploy-production.ps1
   ```

2. **Update production .env**:
   ```bash
   # Add this to your production .env
   TRUST_PROXY=true
   ```

3. **Configure Azure Gateway** to send headers:
   - X-Forwarded-Proto: https
   - X-Forwarded-For: <client-ip>

## Azure Gateway Configuration

The gateway MUST be configured to add these headers. In Azure Application Gateway:

1. Go to your Application Gateway resource
2. Navigate to "Rewrites" or "HTTP Settings"
3. Add request headers:
   - Header name: `X-Forwarded-Proto`
   - Header value: `https`
   - Header name: `X-Forwarded-For`
   - Header value: `{var_client_ip}`

## Testing

After deployment, test with:
```bash
curl -k https://51.54.96.228/api/auth/test-config
```

Look for:
- `proxy.xForwardedProto: "https"`
- `proxy.connectionEncrypted: true`

If these show up, cookies will work correctly.

## Alternative Solution

If you cannot modify Azure Gateway headers, you can force the app to always use secure cookies in production:

```javascript
// In server.js, override protocol detection for production
if (process.env.NODE_ENV === 'production') {
    req.protocol = 'https';
    req.connection.encrypted = true;
}
```

But the proper solution is to configure the gateway correctly.