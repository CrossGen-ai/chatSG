# Insightly CRM API Reference

> **Source**: https://api.insightly.com/v3.1/Help  
> **Last Updated**: 2025-07-06  
> **API Version**: v3.1

## Authentication

```
Authorization: Basic {base64(apiKey + ':')}
```

**Important**: Use API key as username with empty password, not as a standalone encoded value.

## Base URL Pattern

```
https://api.{pod}.insightly.com/v3.1/
```

## Core Endpoints

### Contacts

#### List All Contacts
```http
GET /Contacts?top=20&skip=0
```

#### Get Single Contact
```http
GET /Contacts/{contact_id}
```

#### Search Contacts
```http
GET /Contacts/Search?field_name=FIELD&field_value=VALUE&top=20
```

**Supported Search Fields**:
- `FIRST_NAME` - Contact's first name
- `LAST_NAME` - Contact's last name  
- `EMAIL_ADDRESS` - Contact's email
- `ORGANISATION_NAME` - Company/organization name
- `PHONE` - Phone number
- `PHONE_MOBILE` - Mobile phone

### Opportunities

#### List All Opportunities
```http
GET /Opportunities?top=20&skip=0
```

#### Get Single Opportunity
```http
GET /Opportunities/{opportunity_id}
```

#### Search Opportunities
```http
GET /Opportunities/Search?field_name=FIELD&field_value=VALUE&top=20
```

#### Get Contact's Opportunities
```http
GET /Opportunities/Search?field_name=CONTACT_ID&field_value={contact_id}&top=50
```

### Leads

#### List All Leads
```http
GET /Leads?top=20&skip=0
```

#### Get Single Lead
```http
GET /Leads/{lead_id}
```

#### Search Leads
```http
GET /Leads/Search?field_name=FIELD&field_value=VALUE&top=20
```

## Query Parameters

### Pagination
- `top` - Maximum number of records to return (replaces OData `$top`)
- `skip` - Number of records to skip for pagination (replaces OData `$skip`)
- `count_total` - Include total record count in response header

### Search
- `field_name` - The field to search on
- `field_value` - The value to search for
- `updated_after_utc` - Only return records updated after this date
- `brief` - Return simplified response format

## Important Notes

1. **No OData Support**: Insightly does NOT support OData query syntax like `$filter`, `$orderby`, etc.
2. **Search Limitations**: Search is field-specific using `field_name`/`field_value` pattern
3. **Rate Limiting**: API has rate limits - implement appropriate delays
4. **Relationships**: Use search endpoints to find related records (e.g., opportunities for a contact)

## Error Handling

- **429**: Rate limit exceeded - wait and retry
- **404**: Resource not found
- **401**: Authentication failed
- **400**: Bad request (invalid parameters)

## Implementation Checklist

- [ ] Use correct authentication format
- [ ] Use `/Search` endpoints for filtering
- [ ] Use `top`/`skip` instead of `$top`/`$skip`
- [ ] Implement rate limiting with delays
- [ ] Handle relationship queries via search
- [ ] Never use OData syntax (`$filter`, `$orderby`, etc.)

## Code Examples

### Search Contact by Email
```javascript
const response = await client.get('/Contacts/Search', {
  params: {
    field_name: 'EMAIL_ADDRESS',
    field_value: 'john@example.com',
    top: 1
  }
});
```

### Get Contact's Opportunities
```javascript
const response = await client.get('/Opportunities/Search', {
  params: {
    field_name: 'CONTACT_ID',
    field_value: contactId,
    top: 50
  }
});
```