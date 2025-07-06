# CRM Usage Examples

Now that your Insightly API key is configured, here are some example queries you can use with ChatSG:

## Contact Queries

```
"Find customer john.doe@example.com"
"Search for contacts at Microsoft" 
"Show me contacts with phone 555-1234"
"Get lead score for sarah@company.com"
"Find all contacts in New York"
```

## Pipeline & Opportunity Queries

```
"Show me the sales pipeline status"
"What opportunities are closing this month?"
"Analyze pipeline conversion rates"
"Show opportunities worth over $50,000"
"What deals are in the negotiation stage?"
"Forecast revenue for next quarter"
```

## General CRM Queries

```
"Show me today's CRM activity"
"List my top 10 customers by value"
"Find all open opportunities"
"Show stalled deals in the pipeline"
"Which opportunities need attention?"
```

## Using the CRM Agent

The CRM agent will automatically be selected when you ask CRM-related questions. It will:

1. **Parse your query** - Understand what you're looking for
2. **Search the CRM** - Query Insightly API with appropriate filters
3. **Enrich data** - Add lead scores and summaries
4. **Format results** - Present data in an easy-to-read format

## API Limits

- Rate limit: 10 requests per second
- Results are cached for 5-10 minutes to improve performance
- Maximum 50 records per page (automatic pagination)

## Troubleshooting

If you get authentication errors:
1. Check your API key in `.env` file
2. Verify the API URL matches your Insightly region
3. Ensure your API key has the necessary permissions

## Next Steps

Try these queries in ChatSG:
1. Start the servers: `npm run dev`
2. Open the frontend: http://localhost:5173
3. Type any CRM query and see the results!

The CRM agent will automatically handle your queries and return formatted results with relevant information.