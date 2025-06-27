# ChatSG Slash Command System

## Overview

The ChatSG slash command system provides direct agent routing capabilities, allowing users to force specific agents to handle their requests while bypassing the normal orchestration selection process. The system supports both frontend-driven metadata and legacy message parsing for backward compatibility.

## Architecture Components

### 1. Frontend Integration
Modern slash command processing with clean message separation and metadata transmission.

```typescript
// Frontend sends clean message + metadata
{
  "message": "hello world",           // Clean message without slash command
  "slashCommand": {                   // Separate metadata
    "command": "creative",
    "agentType": "CreativeAgent"
  }
}
```

### 2. Backend Processing
Simple processing that uses frontend metadata or falls back to normal orchestration.

```javascript
// Backend processes frontend metadata only
if (data.slashCommand) {
    // Frontend-driven slash command approach
    routingMetadata = {
        forceAgent: true,
        agentType: data.slashCommand.agentType,
        commandName: data.slashCommand.command,
        confidence: 1.0
    };
} else {
    // Normal orchestration - no slash command
    // Standard agent selection logic
}
```

### 3. Agent Routing
Direct agent selection bypassing orchestrator with maximum confidence.

```javascript
// Forced routing implementation
const targetAgent = orchestrator.getAgent(agentName);
const forcedResult = await orchestrator.delegateTask(task, agentName);

// Response with forced routing metadata
{
    "_agent": "CreativeAgent",
    "_orchestration": {
        "confidence": 1.0,
        "reason": "Forced routing via slash command: /creative",
        "forcedBySlashCommand": true
    }
}
```

## Available Commands

### Core Agent Commands
- **`/creative`** → Routes to CreativeAgent for writing, brainstorming, and imaginative tasks
- **`/analytical`** → Routes to AnalyticalAgent for data analysis, research, and logical reasoning  
- **`/technical`** → Routes to TechnicalAgent for programming, troubleshooting, and technical support

### Command Aliases
Each command supports multiple invocation methods:
- Full name: `/creative`, `/analytical`, `/technical`
- Short forms: `/c`, `/a`, `/t` (if configured)
- Case insensitive matching

## Frontend Implementation

### 1. SlashCommandInput Component
Enhanced input component with autocomplete and visual feedback.

```typescript
// Key features:
- Real-time slash command detection
- Autocomplete dropdown with keyboard navigation
- Ghost text preview for tab completion
- Visual indicators and agent emojis
- Theme-aware styling
```

### 2. useSlashCommands Hook
Custom React hook for slash command management.

```typescript
const {
  commands,           // Available slash commands
  loading,           // Loading state
  error,             // Error state
  validateCommand,   // Command validation
  findMatches       // Search functionality
} = useSlashCommands();
```

### 3. Integration Flow
```
User types "/" → Dropdown appears → User selects command → Clean message sent with metadata
                                                        ↓
Frontend: { message: "hello", slashCommand: { command: "creative", agentType: "CreativeAgent" } }
                                                        ↓
Backend: Forced routing to CreativeAgent with confidence 1.0
```

## Backend Implementation

### 1. Request Processing Pipeline

```javascript
// 1. Frontend metadata check
if (data.slashCommand) {
    console.log(`Frontend slash command: /${data.slashCommand.command} → ${data.slashCommand.agentType}`);
    routingMetadata = createForcedRouting(data.slashCommand);
}

// 2. Normal orchestration (no slash command)
else {
    console.log(`Normal orchestration for: ${message}`);
    // Standard agent selection logic
}
```

### 2. Agent Resolution
```javascript
// Find target agent by capabilities
const availableAgents = orchestrator.listAgents();
const targetCapabilities = availableAgents.find(agent => 
    agent.name === forcedAgentName || 
    agent.type === forcedAgentName ||
    agent.name.includes(forcedAgentName.replace('Agent', ''))
);

// Get actual agent instance
const targetAgent = orchestrator.getAgent(targetCapabilities.name);
```

### 3. Forced Task Execution
```javascript
// Create high-priority task for forced agent
const forcedTask = {
    id: `forced-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'chat',
    input: processedMessage,    // Clean message without slash command
    parameters: { sessionId },
    priority: 1                 // Highest priority
};

// Direct delegation bypassing orchestrator selection
const result = await orchestrator.delegateTask(forcedTask, targetAgentName);
```

## Message Storage & Metadata

### 1. User Message Storage
```json
{
  "sessionId": "default",
  "type": "user", 
  "content": "hello world",
     "metadata": {
     "slashCommand": {
       "command": "creative",
       "agentType": "CreativeAgent"
     },
    "forcedRouting": {
      "forceAgent": true,
      "agentType": "CreativeAgent",
      "commandName": "creative",
      "confidence": 1.0
    }
  }
}
```

### 2. Assistant Response Storage
```json
{
  "sessionId": "default",
  "type": "assistant",
  "content": "Creative response here...",
  "metadata": {
    "agent": "CreativeAgent",
    "confidence": 1.0,
    "processingTime": 1258,
    "slashCommandContext": {
      "forcedAgent": true,
      "commandUsed": "creative", 
      "wasForced": true
    }
  }
}
```

## API Reference

### Chat Endpoint with Slash Commands

#### POST /api/chat

**Frontend Format (Preferred):**
```json
{
  "message": "hello world",
  "sessionId": "session123", 
  "slashCommand": {
    "command": "creative",
    "agentType": "CreativeAgent"
  }
}
```



**Response Format:**
```json
{
  "message": "Creative response...",
  "_backend": "orchestrator",
  "_agent": "CreativeAgent", 
  "_session": "session123",
  "_timestamp": "2025-06-27T05:32:48.161Z",
  "_orchestration": {
    "confidence": 1.0,
    "reason": "Forced routing via slash command: /creative",
    "executionTime": 1258,
    "agentLockUsed": false,
    "forcedBySlashCommand": true
  },
  "success": true,
  "_slashCommand": {
    "detected": true,
    "command": "creative", 
    "agentType": "CreativeAgent",
    "processedMessage": "hello world"
  }
}
```

## Configuration

### 1. Backend Configuration
Slash commands are configured in `backend/config/slash-commands.json`:

```json
{
  "commands": [
    {
      "name": "creative",
      "agentType": "CreativeAgent", 
      "description": "Route to creative agent for writing and brainstorming",
      "aliases": ["c", "write", "create"]
    },
    {
      "name": "analytical", 
      "agentType": "AnalyticalAgent",
      "description": "Route to analytical agent for data analysis",
      "aliases": ["a", "analyze", "data"]
    },
    {
      "name": "technical",
      "agentType": "TechnicalAgent", 
      "description": "Route to technical agent for programming help",
      "aliases": ["t", "tech", "code"]
    }
  ]
}
```

### 2. Frontend Configuration
Commands are fetched dynamically from `/api/slash-commands` endpoint and cached locally.

## Testing & Validation

### 1. Frontend Testing
```bash
# Test slash command detection
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "slashCommand": {"command": "creative", "agentType": "CreativeAgent"}}'

# Expected: CreativeAgent response with confidence 1.0
```



### 2. Normal Message Testing
```bash
# Test normal orchestration
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'

# Expected: Normal agent selection with lower confidence
```

## Error Handling

### 1. Invalid Commands
- Frontend validation prevents invalid commands from being sent
- Backend gracefully handles unknown commands by falling back to normal orchestration
- Error messages provide suggestions for valid commands

### 2. Agent Unavailability
- If forced agent is not available, system falls back to normal orchestration
- Warning logged but request continues processing
- Response includes fallback information

### 3. Processing Failures
- Slash command processing errors don't break the chat flow
- Original message is preserved and processed normally
- Detailed error logging for debugging

## Performance Considerations

### 1. Frontend Optimization
- Command list cached locally with localStorage
- Debounced API calls for command fetching
- Efficient dropdown rendering with virtualization for large command lists

### 2. Backend Optimization  
- Frontend metadata processing is O(1) - no parsing required
- Agent lookup optimized with capability-based matching
- Forced routing bypasses expensive orchestration algorithms

### 3. Storage Efficiency
- Slash command metadata stored compactly in message metadata
- No duplication of command information
- Efficient indexing for slash command analytics

## Architecture Benefits

### Clean Separation of Concerns
- **Frontend**: Handles slash command detection, validation, and UI
- **Backend**: Simple metadata processing with forced routing
- **Orchestrator**: Normal agent selection when no slash command is present

### Simplified Processing Flow
```javascript
// User types: "/creative hello world"  
// Frontend processes and sends: { 
//   message: "hello world", 
//   slashCommand: { command: "creative", agentType: "CreativeAgent" }
// }
// Backend uses metadata directly for forced routing
```

## Monitoring & Analytics

### 1. Slash Command Usage Tracking
- Command frequency analytics
- Agent routing success rates  
- User preference patterns
- Performance metrics per command

### 2. Debug Information
```javascript
// Detailed logging for troubleshooting
console.log(`[Server] Frontend slash command: /${command} → ${agentType}`);
console.log(`[ORCHESTRATOR] Forced routing successful to ${agentName}`);
console.log(`[ORCHESTRATOR] Confidence: 1.0, Execution time: ${time}ms`);
```

### 3. Response Metadata
Every slash command response includes complete routing information for debugging and analytics.

## Future Enhancements

### 1. Dynamic Command Registration
- Runtime command addition/removal
- Plugin-based command system
- Custom user commands

### 2. Advanced Routing
- Multi-agent workflows triggered by commands
- Conditional routing based on context
- Command chaining and composition

### 3. Enhanced UI Features
- Command history and favorites
- Custom command shortcuts
- Visual command builder
