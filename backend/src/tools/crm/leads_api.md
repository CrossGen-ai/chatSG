# Insightly Leads API Documentation

## Base URL
`https://api.{pod}.insightly.com/v3.1`

## Authentication
- Basic Authentication with API key as username, empty password
- Header: `Authorization: Basic {base64(apiKey:)}`

## Endpoints

### GET /Leads
Retrieves a list of leads.

**Query Parameters:**
- `top` (integer): Number of records to return (max 500)
- `skip` (integer): Number of records to skip for pagination
- `updated_after_utc` (string): Filter leads updated after this date (ISO 8601 format)
- `count_total` (boolean): If true, returns total count in `X-Total-Count` header

**Example:**
```
GET /Leads?top=20&updated_after_utc=2024-01-01T00:00:00Z
```

### GET /Leads/Search
Search leads by specific field.

**Query Parameters:**
- `field_name` (string): The field to search by
  - Standard fields: `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `ORGANISATION_NAME`, `LEAD_STATUS_ID`
  - Custom fields: Use custom field ID
- `field_value` (string): The value to search for
- `top` (integer): Number of records to return
- `skip` (integer): Number of records to skip

**Example:**
```
GET /Leads/Search?field_name=LEAD_RATING&field_value=5&top=10
```

### GET /Leads/{id}
Get a specific lead by ID.

**Path Parameters:**
- `id` (integer): Lead ID

### POST /Leads/{id}/Convert
Convert a lead to contact, organization, and/or opportunity.

**Path Parameters:**
- `id` (integer): Lead ID to convert

**Request Body:**
```json
{
  "CREATE_CONTACT": true,
  "CREATE_ORGANISATION": true,
  "CREATE_OPPORTUNITY": true,
  "OPPORTUNITY_NAME": "New Opportunity from Lead",
  "OPPORTUNITY_DETAILS": "Converted from lead"
}
```

## Response Format

### Lead Object
```json
{
  "LEAD_ID": 456789,
  "FIRST_NAME": "Jane",
  "LAST_NAME": "Smith",
  "EMAIL": "jane.smith@example.com",
  "PHONE": "+1234567890",
  "MOBILE": "+0987654321",
  "ORGANISATION_NAME": "Example Corp",
  "TITLE": "VP of Sales",
  "LEAD_SOURCE_ID": 1,
  "LEAD_STATUS_ID": 2,
  "LEAD_RATING": 4,
  "CONVERTED_CONTACT_ID": null,
  "CONVERTED_OPPORTUNITY_ID": null,
  "CONVERTED_ORGANISATION_ID": null,
  "DATE_CREATED_UTC": "2024-01-15T10:30:00Z",
  "DATE_UPDATED_UTC": "2024-01-20T14:45:00Z",
  "CUSTOM_FIELDS": [],
  "TAGS": [
    {
      "TAG_NAME": "Hot Lead"
    }
  ]
}
```

### Lead Rating
- Integer value typically 1-5
- Higher values indicate better quality leads
- Used for prioritization and scoring

### Lead Status
- Defined by `LEAD_STATUS_ID`
- Common statuses include: New, Contacted, Qualified, Unqualified
- Check `/LeadStatuses` endpoint for available options

### Lead Source
- Defined by `LEAD_SOURCE_ID`
- Common sources: Website, Email Campaign, Trade Show, Referral
- Check `/LeadSources` endpoint for available options

## Common Use Cases

### Get Latest Leads
Since there's no `orderby` parameter:
1. Use `GET /Leads` to retrieve all leads
2. Sort client-side by `DATE_CREATED_UTC` descending
3. Take the first N results

### Get High-Quality Leads
1. Search by rating: `GET /Leads/Search?field_name=LEAD_RATING&field_value=5`
2. Or get all leads and filter client-side for `LEAD_RATING >= 4`

### Get Unconverted Leads
1. Retrieve all leads
2. Filter client-side where `CONVERTED_CONTACT_ID` is null

### Lead Conversion Workflow
1. Get lead details: `GET /Leads/{id}`
2. Convert lead: `POST /Leads/{id}/Convert`
3. Response includes IDs of created contact/org/opportunity

## Important Notes

1. **Lead vs Contact**: Leads are potential customers; Contacts are established relationships
2. **Conversion**: Once converted, lead data is transferred to Contact/Organization/Opportunity
3. **No OData Support**: Cannot use `$filter`, `$orderby`, etc.
4. **Email Field**: Note that Leads use `EMAIL` while Contacts use `EMAIL_ADDRESS`
5. **Search Limitations**: Can only search by one field at a time
6. **Client-Side Operations**: Most filtering and sorting must be done client-side