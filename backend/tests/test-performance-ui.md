# Performance Monitoring Test Instructions

## How to Test Performance Monitoring

1. **Open the ChatSG UI**
   - Navigate to http://localhost:5173 in your browser
   - You should see the chat interface

2. **Send a Test Message**
   - Type "hello" in the chat input
   - Press Enter or click Send
   - Wait for the AI response to complete

3. **Check Performance Dashboard**
   - In your terminal, run:
   ```bash
   curl -s http://localhost:3000/api/performance/dashboard | jq
   ```

4. **What You Should See**
   - The dashboard will show performance metrics for:
     - **Database Operations**: Session checks, message saves
     - **Routing**: Agent selection time
     - **LLM Operations**: Time to first token (TTFT), total streaming time
     - **Recent Operations**: List of timed operations
   
5. **Example Output**
   After sending a message, you should see non-zero values in:
   ```json
   {
     "operations": {
       "database": {
         "queries": {
           "count": 3,
           "totalTime": 45.2,
           "avgTime": 15.1
         }
       },
       "routing": {
         "selection": {
           "count": 1,
           "totalTime": 12.5,
           "avgTime": 12.5
         },
         "execution": {
           "count": 1,
           "totalTime": 3500.0,
           "avgTime": 3500.0
         }
       },
       "llm": {
         "streaming": {
           "count": 1,
           "totalTime": 3400.0,
           "avgTime": 3400.0,
           "avgTTFT": 850.0
         }
       }
     }
   }
   ```

## Performance Metrics Explained

- **TTFT (Time to First Token)**: How long before the AI starts responding
- **Total LLM Time**: Complete time for AI response generation
- **Database Query Time**: Time spent on database operations
- **Agent Selection**: Time to choose which AI agent handles the request
- **Agent Execution**: Total time the agent takes to process the message

## Bottleneck Detection

The dashboard will automatically identify bottlenecks when:
- Memory searches take > 200ms
- TTFT > 2000ms  
- Database queries > 100ms
- Agent routing > 150ms

## Clear Statistics

To reset the performance data:
```bash
curl -X POST http://localhost:3000/api/performance/clear
```