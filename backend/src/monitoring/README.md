# Performance Monitoring System

## Overview

This performance monitoring system tracks timing for all major operations in ChatSG:
- Memory operations (Qdrant searches, context building)
- LLM calls (time to first token, streaming speed)
- Database queries
- Agent routing and execution

## Quick Start

1. **Enable monitoring** in your `.env`:
```bash
ENABLE_PERFORMANCE_MONITORING=true
PERF_LOG_THRESHOLD_MS=100        # Log operations over 100ms
PERF_SUMMARY_INTERVAL_MS=60000   # Summary every minute
```

2. **Add middleware** to server.js:
```javascript
const { performanceMonitoringMiddleware } = require('./src/monitoring/performance-monitor');
app.use(performanceMonitoringMiddleware);
```

3. **View dashboard** at: `http://localhost:3000/api/performance/dashboard`

## Architecture

### Components

1. **performance-monitor.js** - Core middleware and tracking
2. **operation-timers.js** - Specialized timers for different operations
3. **performance-dashboard.js** - Dashboard API and analytics

### Key Metrics Tracked

| Operation | Metrics |
|-----------|---------|
| Memory Search | Duration, result count |
| LLM Streaming | Time to first token (TTFT), tokens/second |
| Database | Query duration |
| Agent Routing | Selection time, execution time |

## Usage Examples

### Basic Request Timing
Automatically tracked by middleware - adds `X-Response-Time` header to all responses.

### Memory Operation Timing
```javascript
const timer = new MemoryOperationTimer(requestId);

timer.markMemorySearchStart();
const results = await mem0Service.search(query);
timer.markMemorySearchEnd(results.length);
```

### LLM Streaming Timing
```javascript
const timer = new LLMOperationTimer(requestId, 'gpt-4');

timer.markRequestStart(inputTokens);
// ... start streaming
timer.markFirstTokenReceived();  // Call on first token
// ... continue streaming
timer.markStreamingComplete(outputTokens);
```

### Database Query Timing
```javascript
const timer = new DatabaseOperationTimer(requestId);

const result = await timer.timeQuery('get-user', async () => {
    return await db.query('SELECT * FROM users WHERE id = $1', [userId]);
});
```

## Performance Dashboard

Access at: `GET /api/performance/dashboard`

Returns:
```json
{
  "enabled": true,
  "summary": {
    "totalOperations": 87,
    "percentiles": {
      "p50": "45.23ms",
      "p90": "234.56ms",
      "p99": "1023.45ms"
    }
  },
  "endpoints": {
    "/api/chats/:id/messages": {
      "requests": 45,
      "avgTime": "156.78ms",
      "minTime": "23.45ms",
      "maxTime": "2345.67ms"
    }
  },
  "operations": {
    "memory": {
      "search": {
        "count": 123,
        "avgTime": 78.9,
        "maxTime": 456.7
      }
    },
    "llm": {
      "streaming": {
        "count": 45,
        "avgTime": 1234.5,
        "avgTTFT": 234.5
      }
    }
  },
  "bottlenecks": [
    {
      "type": "memory-search",
      "severity": "high",
      "avgTime": "234.56ms",
      "impact": "Slow memory searches delay responses"
    }
  ],
  "recommendations": [
    {
      "issue": "Slow memory searches",
      "suggestions": [
        "Ensure Qdrant indices are optimized",
        "Consider reducing the number of memories searched"
      ]
    }
  ]
}
```

## Optimization Targets

Based on industry standards:

| Operation | Good | Acceptable | Needs Optimization |
|-----------|------|------------|-------------------|
| Memory Search | <50ms | 50-200ms | >200ms |
| LLM TTFT | <500ms | 500-2000ms | >2000ms |
| DB Query | <20ms | 20-100ms | >100ms |
| Agent Selection | <50ms | 50-150ms | >150ms |
| Total Request | <1s | 1-3s | >3s |

## Console Output

When enabled, you'll see:
```
[PERF] Slow request detected: POST /api/chats/123/messages
[PERF] Total: 2345.67ms
[PERF] Breakdown: {
  "memory-search": { "duration": "234.56", "percentage": "10.0" },
  "agent-selection": { "duration": "45.67", "percentage": "1.9" },
  "llm-streaming": { "duration": "2065.44", "percentage": "88.1" }
}

[PERF:Memory] Search took 234.56ms, found 15 results
[PERF:LLM] gpt-4 - Total: 2065ms, TTFT: 456ms, Stream: 1609ms, TPS: 25.3
[PERF:Agent] AnalyticalAgent execution: 2111.23ms
```

## Integration Checklist

- [ ] Add environment variables to `.env`
- [ ] Import and add middleware to server.js
- [ ] Add dashboard routes
- [ ] Wrap memory operations with MemoryOperationTimer
- [ ] Wrap LLM calls with LLMOperationTimer
- [ ] Wrap database queries with DatabaseOperationTimer
- [ ] Add agent routing timers
- [ ] Test dashboard at `/api/performance/dashboard`

## Production Recommendations

1. **Sampling**: In production, consider sampling (e.g., track 10% of requests)
2. **Storage**: Export metrics to time-series database (Prometheus, InfluxDB)
3. **Alerting**: Set up alerts for performance degradation
4. **Visualization**: Use Grafana for real-time dashboards

## Troubleshooting

**No data showing up?**
- Check `ENABLE_PERFORMANCE_MONITORING=true` is set
- Restart the server after adding environment variable
- Make some requests to generate data

**Too much console output?**
- Increase `PERF_LOG_THRESHOLD_MS` to only log slower operations
- Set `PERF_SUMMARY_INTERVAL_MS=0` to disable periodic summaries

**Performance overhead?**
- The monitoring itself adds <1ms overhead
- Disable in production with `ENABLE_PERFORMANCE_MONITORING=false`