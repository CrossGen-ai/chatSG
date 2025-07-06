# CRM Slash Command

The CRM agent now has a dedicated slash command to force routing to it.

## Usage

Type `/crm` followed by your query to force the CRM agent to handle your request:

```
/crm find customer john@example.com
/crm show pipeline status
/crm opportunities closing this month
/crm search contacts at Microsoft
```

## Aliases

You can also use these shorter aliases:
- `/customer` - for customer-related queries
- `/insightly` - when you specifically want Insightly data
- `/pipeline` - for pipeline analysis
- `/contact` - for contact searches
- `/opportunity` - for opportunity queries

## Examples

```
/crm peter.kelly@nzdf.mil.nz
/customer show me top 10 by value
/pipeline analyze conversion rates
/contact find all in New York
/opportunity forecast next quarter
```

## Benefits

Using the slash command:
1. **Guarantees** the CRM agent handles your query
2. **Bypasses** the automatic agent selection
3. **Faster** routing without pattern analysis
4. **Explicit** control over which agent to use

## How it Works

When you use `/crm` or its aliases, the system:
1. Detects the slash command
2. Strips it from your message
3. Routes directly to the CRM agent
4. Processes your query with CRM tools

No need to restart servers - the slash command is loaded dynamically!