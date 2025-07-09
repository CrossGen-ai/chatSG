# Insightly Contacts API Documentation

## Base URL
`https://api.{pod}.insightly.com/v3.1`

## Authentication
- Basic Authentication with API key as username, empty password
- Header: `Authorization: Basic {base64(apiKey:)}`

## Endpoints

### GET /Contacts
Retrieves a list of contacts.

**Query Parameters:**
- `top` (integer): Number of records to return (max 500)
- `skip` (integer): Number of records to skip for pagination
- `updated_after_utc` (string): Filter contacts updated after this date (ISO 8601 format: `2018-04-09T16:58:14Z`)
- `count_total` (boolean): If true, returns total count in `X-Total-Count` header

**Example:**
```
GET /Contacts?top=20&updated_after_utc=2024-01-01T00:00:00Z
```

### GET /Contacts/Search
Search contacts by specific field.

**Query Parameters:**
- `field_name` (string): The field to search by
  - Standard fields: `FIRST_NAME`, `LAST_NAME`, `EMAIL_ADDRESS`, `PHONE`, `ORGANISATION_NAME`
  - Custom fields: Use custom field ID
- `field_value` (string): The value to search for
- `top` (integer): Number of records to return
- `skip` (integer): Number of records to skip

**Example:**
```
GET /Contacts/Search?field_name=EMAIL_ADDRESS&field_value=john@example.com&top=10
```

### GET /Contacts/{id}
Get a specific contact by ID.

**Path Parameters:**
- `id` (integer): Contact ID

**Example:**
```
GET /Contacts/123456
```

## Response Format

### Contact Object
```json
{
  "CONTACT_ID": 123456,
  "FIRST_NAME": "John",
  "LAST_NAME": "Doe",
  "EMAIL_ADDRESS": "john.doe@example.com",
  "PHONE": "+1234567890",
  "PHONE_MOBILE": "+0987654321",
  "ORGANISATION_NAME": "Example Corp",
  "ORGANISATION_ID": 789012,
  "TITLE": "CEO",
  "DATE_CREATED_UTC": "2024-01-15T10:30:00Z",
  "DATE_UPDATED_UTC": "2024-01-20T14:45:00Z",
  "CUSTOM_FIELDS": [
    {
      "CUSTOM_FIELD_ID": "CONTACT_FIELD_1",
      "FIELD_VALUE": "Custom Value"
    }
  ],
  "TAGS": [
    {
      "TAG_NAME": "VIP"
    }
  ]
}
```

## Important Notes

1. **No OData Support**: Insightly does NOT support OData query parameters like `$filter`, `$orderby`, etc.
2. **Sorting**: The API does not provide server-side sorting. Implement client-side sorting.
3. **Date Filtering**: Only `updated_after_utc` is documented. `created_after_utc` may not be supported.
4. **Search Limitations**: 
   - Search endpoint only supports one field at a time
   - Cannot combine multiple search criteria in a single request
   - For complex queries, retrieve all records and filter client-side
5. **Pagination**: Use `top` and `skip` (not `$top` and `$skip`)
6. **Rate Limiting**: Respect API rate limits (typically 10 requests/second)

## Common Use Cases

### Get Latest Contacts
Since there's no `orderby` parameter, to get the latest contacts:
1. Use GET /Contacts with no filters to get all contacts
2. Sort client-side by `DATE_CREATED_UTC` descending
3. Take the first N results

### Get Contacts Created Today
1. Calculate today's start time in UTC
2. Use `updated_after_utc` parameter (if contact was created today, it was also updated today)
3. Filter results client-side by `DATE_CREATED_UTC` if needed

### Search by Name
Since you can only search one field at a time:
1. Search by FIRST_NAME first
2. If no results, search by LAST_NAME
3. Consider implementing fuzzy matching client-side