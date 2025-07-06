# CRM Integration Documentation

## Overview

The ChatSG CRM integration provides a specialized agent and tools for interacting with Insightly CRM. This integration enables users to query customer information, analyze sales pipelines, and track opportunities through natural language conversations.

## Features

### CRM Agent
- **Natural Language Processing**: Understands CRM-related queries and routes them appropriately
- **LangGraph Workflow**: Uses state-based workflow for complex query processing
- **Intent Recognition**: Automatically identifies query types (customer lookup, pipeline analysis, etc.)
- **Data Enrichment**: Adds context like lead scores and opportunity summaries

### Available Tools

#### 1. InsightlyApiTool
- Base API client with rate limiting (10 requests/second)
- Authentication via API key
- Automatic retry and error handling
- Support for contacts, opportunities, and leads

#### 2. ContactManagerTool
- Intelligent contact search (by name, email, company)
- Contact enrichment with lead scoring
- Opportunity association tracking
- Smart query parsing

#### 3. OpportunityTool
- Pipeline analysis and visualization
- Opportunity forecasting
- Stage progression tracking
- Win rate calculations

## Configuration

### Environment Variables
```bash
# Required
INSIGHTLY_API_KEY=your_api_key_here

# Optional
INSIGHTLY_API_URL=https://api.na1.insightly.com/v3.1  # Default NA region
CRM_RATE_LIMIT_REQUESTS=10                            # Requests per second
CRM_RATE_LIMIT_WINDOW_MS=1000                        # Rate limit window
CRM_TIMEOUT=10000                                    # Request timeout in ms
CRM_RETRY_ATTEMPTS=3                                 # Number of retries
CRM_MAX_PAGE_SIZE=50                                 # Max records per page
```

## Usage Examples

### Customer Lookup
```
User: Find customer john.doe@example.com
CRM Agent: Found 1 contact:
**John Doe** at Example Corp
📧 john.doe@example.com | 📞 555-1234
🎯 Lead Score: 85/100
💼 Opportunities: 3
💰 Total Value: $150,000
```

### Pipeline Analysis
```
User: Show me the sales pipeline status
CRM Agent: ## 📊 Sales Pipeline
Summary:
- Total Opportunities: 45
- Total Value: $1,250,000
- Average Deal Size: $27,778
- Win Rate: 32.5%
- Average Sales Cycle: 45 days

Stage Breakdown:
**Qualification**
  - Opportunities: 15
  - Value: $375,000
  - Avg Time: 7 days
...
```

### Opportunity Search
```
User: Show open opportunities above $50k
CRM Agent: Found 8 opportunities:
**Enterprise Deal - Acme Corp**
💰 $125,000 | 🎯 80% probability
📊 Sales Pipeline → Negotiation
📅 Forecast close: 2024-02-15 (30 days)
...
```

## Architecture

### AI-Powered Query Understanding
The CRM agent now uses **AI (LLM) for intelligent query analysis**:
- **Natural language understanding** - Handles variations and typos
- **Smart parameter extraction** - Identifies emails, names, companies automatically
- **Context-aware intent detection** - Understands what you're really asking for
- **Fallback to patterns** - Uses fast pattern matching for common queries

### Workflow Stages
1. **Intake**: Process user input
2. **Query Analysis**: AI analyzes intent (with pattern matching fallback)
3. **Data Retrieval**: Fetch data from CRM API
4. **Enrichment**: Add calculated metrics and insights
5. **Response Generation**: Format results for display

### Query Intent Types
- `customer_lookup`: Search for contacts by various criteria
- `pipeline_status`: Analyze sales pipeline health
- `opportunity_details`: Get specific opportunity information
- `lead_information`: Query lead status and scoring
- `general_query`: Fallback for unmatched queries

## Security

- API keys stored in environment variables only
- No sensitive data logged
- Rate limiting prevents API abuse
- Input validation on all queries
- Secure HTTPS connections

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check INSIGHTLY_API_KEY is set correctly
   - Verify API key has necessary permissions

2. **Rate Limit Exceeded**
   - Reduce concurrent requests
   - Implement request queuing
   - Check daily API limits

3. **No Results Found**
   - Verify search criteria spelling
   - Check data exists in CRM
   - Try broader search terms

### Debug Mode
Set environment variable `DEBUG=crm:*` to enable detailed logging:
```bash
DEBUG=crm:* npm run dev
```

## Performance Considerations

- **Caching**: Contact and pipeline data cached for 5-10 minutes
- **Pagination**: Large result sets automatically paginated
- **Lazy Loading**: Tools initialized only when needed
- **Connection Pooling**: Reuses HTTP connections

## Future Enhancements

- [ ] Write operations (create/update contacts)
- [ ] Custom field mapping
- [ ] Webhook integration for real-time updates
- [ ] Advanced analytics and reporting
- [ ] Multi-CRM support (Salesforce, HubSpot)
- [ ] Bulk operations
- [ ] Export functionality

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API logs for detailed error messages
3. Contact the ChatSG development team
4. Submit issues to the project repository