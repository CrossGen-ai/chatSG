# Insightly API v3.1 Complete Documentation

## Overview
Insightly CRM API provides RESTful access to CRM data including Contacts, Leads, Opportunities, and more.

## Base URL
```
https://api.{pod}.insightly.com/v3.1
```

Where `{pod}` is your regional pod:
- `na1` - North America
- `eu1` - Europe  
- `ap1` - Asia Pacific

## Authentication
Basic Authentication using API key:
- Username: Your API key
- Password: Empty string
- Header: `Authorization: Basic {base64(apiKey:)}`

## Key Limitations

### No OData Support
Insightly does **NOT** support OData query parameters:
- ❌ `$filter` - Not supported
- ❌ `$orderby` - Not supported  
- ❌ `$select` - Not supported
- ❌ `$expand` - Not supported

### Pagination
Use standard parameters (not OData):
- ✅ `top` - Number of records (max 500)
- ✅ `skip` - Number to skip
- ✅ `count_total=true` - Get total count in header

### Search Limitations
- Can only search one field at a time
- Use `/Search` endpoints with `field_name` and `field_value`
- No complex queries or joins
- No full-text search across multiple fields

### Sorting
- **No server-side sorting available**
- Must retrieve records and sort client-side
- Consider pagination limits when sorting large datasets

### Date Filtering
- Limited to `updated_after_utc` parameter
- Format: ISO 8601 (`2024-01-01T00:00:00Z`)
- No `created_after_utc` documented
- No date range filters

## Common Patterns

### Get Latest Records
Since no `orderby` is available:
```
1. GET /Contacts?top=500
2. Sort client-side by DATE_CREATED_UTC descending
3. Take first N results
```

### Search by Multiple Criteria
Since only one field search is allowed:
```
1. Search by most specific field first
2. If no results, try alternative fields
3. Or get all records and filter client-side
```

### Time-Based Queries
For "contacts added yesterday":
```
1. GET /Contacts?updated_after_utc={yesterday_start}
2. Filter client-side by DATE_CREATED_UTC
3. Further filter for exact date range
```

### Performance Optimization
1. Use specific field searches when possible
2. Minimize use of wildcard queries
3. Cache results when appropriate
4. Implement client-side filtering efficiently
5. Use pagination to limit response size

## Rate Limiting
- Default: 10 requests per second
- Implement exponential backoff for 429 errors
- Queue requests to avoid hitting limits

## Error Handling
- 401: Invalid API key
- 403: Insufficient permissions
- 404: Record not found
- 429: Rate limit exceeded
- 500: Server error

## Best Practices
1. Always use pagination for large datasets
2. Implement robust client-side filtering
3. Cache frequently accessed data
4. Use specific searches over wildcards
5. Handle rate limits gracefully
6. Validate data before sending
7. Use appropriate field names for each entity type