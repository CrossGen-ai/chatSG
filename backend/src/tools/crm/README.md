# CRM Integration Documentation

This directory contains our Insightly CRM integration with built-in API compliance validation and real-time streaming capabilities.

## Files Overview

- **`InsightlyApiTool.ts`** - Low-level API client with rate limiting and compliance validation
- **`ContactManagerTool.ts`** - High-level contact management with real-time streaming and formatted results display
- **`OpportunityTool.ts`** - Opportunity and pipeline management
- **`api-compliance.ts`** - API compliance validator and field mappings
- **`config.ts`** - Configuration management
- **`types.ts`** - TypeScript type definitions

## API Compliance Features

### 🛡️ Built-in Validation
- **Authentication**: Validates Basic auth format (API key as username)
- **Endpoints**: Ensures proper use of `/Search` endpoints vs. base endpoints
- **Parameters**: Prevents use of unsupported OData syntax (`$filter`, `$orderby`)
- **Field Names**: Validates against official Insightly field names

### 📋 Compliance Logging
```
[API Compliance] searchContacts: /Contacts/Search - COMPLIANT ✓
[API Compliance] Authentication - COMPLIANT ✓
```

### ⚠️ Error Prevention
The system will throw errors if you try to:
- Use OData syntax (`$filter`, `$top`, etc.)
- Use incorrect authentication format
- Call search endpoints without required parameters

## Real-Time Streaming Features

### 🚀 Live Tool Status
The ContactManagerTool provides real-time status updates during execution:
- **Starting**: Shows when search begins
- **Progress**: Updates as contacts are retrieved
- **Results**: Formatted contact information displayed inline
- **Errors**: Clear error messages if search fails

### 📊 Formatted Results Display
Contact results are automatically formatted with:
- Lead scores (0-100)
- Opportunity counts and values
- Last interaction dates
- Contact information (email, phone, company)

## Usage Examples

### Search Contact by Email with Streaming
```typescript
// Pass streamCallback through context
const toolContext = {
  sessionId: 'user-session',
  agentName: 'CRMAgent',
  streamCallback: (token) => { /* handle stream */ }
};

const result = await contactTool.execute({
  action: 'search',
  query: 'john@example.com'
}, toolContext);
```

### Get Contact's Opportunities
```typescript
const opportunities = await contactTool.execute({
  action: 'getOpportunities',
  query: '12345'  // Contact ID
}, toolContext);
```

## Architecture

```
CRM Agent (with streaming callback)
    ↓
ContactManagerTool / OpportunityTool (streaming-enabled)
    ↓  
InsightlyApiTool + API Compliance Validator
    ↓
Insightly API (v3.1)
    
Frontend receives:
- tool_start events
- tool_progress updates  
- tool_result with formatted data
- Inline display in chat UI
```

## API Requirements Checklist

- [x] ✅ Use API key as username with empty password
- [x] ✅ Use `/Search` endpoints for filtering
- [x] ✅ Use `top`/`skip` for pagination (not `$top`/`$skip`)
- [x] ✅ Never use OData syntax
- [x] ✅ Implement rate limiting
- [x] ✅ Use correct field names from Insightly docs
- [x] ✅ Handle relationship queries via search

## Documentation References

- **[Insightly API Help](https://api.insightly.com/v3.1/Help)** - Official API documentation
- **[Local API Reference](../../../docs/crm-api-reference.md)** - Our implementation guide
- **[Field Mappings](./api-compliance.ts)** - Official field names for each entity type

## Testing Compliance

The system automatically validates API compliance on every request. To manually test:

```typescript
import { validateEndpointCompliance } from './api-compliance';

const params = new URLSearchParams();
params.append('field_name', 'EMAIL_ADDRESS'); 
params.append('field_value', 'test@example.com');

const result = validateEndpointCompliance('/Contacts/Search', params);
console.log(result.compliant); // true
```

## Common Mistakes to Avoid

❌ **Don't do this:**
```javascript
// Wrong: OData syntax not supported
GET /Contacts?$filter=contains(FIRST_NAME,'John')&$top=10

// Wrong: Incorrect auth format  
Authorization: Basic base64(apiKey)
```

✅ **Do this instead:**
```javascript
// Correct: Use search endpoint
GET /Contacts/Search?field_name=FIRST_NAME&field_value=John&top=10

// Correct: API key as username
Authorization: Basic base64(apiKey + ':')
```