# Insightly Opportunities API Documentation

## Base URL
`https://api.{pod}.insightly.com/v3.1`

## Authentication
- Basic Authentication with API key as username, empty password
- Header: `Authorization: Basic {base64(apiKey:)}`

## Endpoints

### GET /Opportunities
Retrieves a list of opportunities.

**Query Parameters:**
- `top` (integer): Number of records to return (max 500)
- `skip` (integer): Number of records to skip for pagination
- `updated_after_utc` (string): Filter opportunities updated after this date (ISO 8601 format)
- `count_total` (boolean): If true, returns total count in `X-Total-Count` header

**Note:** Unlike some APIs, Insightly does NOT support OData filters like `$filter` or `$orderby`.

### GET /Opportunities/Search
Search opportunities by specific field.

**Query Parameters:**
- `field_name` (string): The field to search by
  - Common fields: `OPPORTUNITY_NAME`, `CONTACT_ID`, `ORGANISATION_ID`, `STAGE_ID`
- `field_value` (string): The value to search for
- `top` (integer): Number of records to return
- `skip` (integer): Number of records to skip

**Example:**
```
GET /Opportunities/Search?field_name=CONTACT_ID&field_value=123456&top=50
```

### GET /Opportunities/{id}
Get a specific opportunity by ID.

**Path Parameters:**
- `id` (integer): Opportunity ID

## Response Format

### Opportunity Object
```json
{
  "OPPORTUNITY_ID": 789012,
  "OPPORTUNITY_NAME": "Enterprise Deal - Acme Corp",
  "OPPORTUNITY_DETAILS": "Large enterprise software deployment",
  "PROBABILITY": 75,
  "BID_AMOUNT": 150000,
  "BID_CURRENCY": "USD",
  "BID_DURATION": 12,
  "BID_TYPE": "Fixed",
  "OPPORTUNITY_VALUE": 150000,
  "OPPORTUNITY_STATE": "OPEN",
  "STAGE_ID": 123,
  "PIPELINE_ID": 456,
  "RESPONSIBLE_USER_ID": 789,
  "ORGANISATION_ID": 345678,
  "CONTACT_ID": 123456,
  "DATE_CREATED_UTC": "2024-01-10T09:00:00Z",
  "DATE_UPDATED_UTC": "2024-01-25T16:30:00Z",
  "FORECAST_CLOSE_DATE": "2024-03-31T00:00:00Z",
  "ACTUAL_CLOSE_DATE": null,
  "CUSTOM_FIELDS": [],
  "TAGS": [
    {
      "TAG_NAME": "Enterprise"
    },
    {
      "TAG_NAME": "Q1-2024"
    }
  ]
}
```

### Opportunity States
- `OPEN` - Active opportunity
- `WON` - Successfully closed
- `LOST` - Lost to competition or other reason
- `ABANDONED` - No longer pursuing
- `SUSPENDED` - Temporarily on hold

## Common Use Cases

### Get Opportunities for a Contact
```
GET /Opportunities/Search?field_name=CONTACT_ID&field_value=123456&top=100
```

### Get Open Opportunities
Since there's no `$filter` support, you must:
1. Get all opportunities: `GET /Opportunities?top=500`
2. Filter client-side for `OPPORTUNITY_STATE = "OPEN"`

### Get High-Value Opportunities
1. Retrieve all opportunities
2. Filter client-side for `OPPORTUNITY_VALUE > threshold`
3. Sort client-side by value descending

### Pipeline Analysis
To analyze opportunities by pipeline stage:
1. Get all opportunities for a pipeline
2. Group client-side by `STAGE_ID`
3. Calculate totals and averages per stage

## Limitations

1. **No Server-Side Filtering**: Must retrieve all records and filter client-side
2. **No Sorting**: Results are not sorted; implement client-side sorting
3. **Search Limitations**: Can only search by one field at a time
4. **Pagination Required**: Use `top` and `skip` for large datasets
5. **Rate Limiting**: Respect API rate limits (typically 10 requests/second)