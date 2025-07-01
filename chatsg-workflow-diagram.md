# ChatSG Workflow Architecture

## Complete Message Flow Diagram

```mermaid
graph TB
    %% Frontend Layer
    subgraph Frontend["Frontend (React App - Port 5173)"]
        UI[ChatUI.tsx<br/>User Interface]
        SCI[SlashCommandInput<br/>Command Detection]
        CM[useChatManager Hook<br/>State Management]
        API[chat.ts<br/>API Client]
        
        UI --> SCI
        SCI --> CM
        CM --> API
    end

    %% User Input
    User[User Input] --> UI
    
    %% Backend Entry
    API -->|"POST /api/chat<br/>sessionId, message,<br/>slashCommand metadata"| Server[server.js<br/>Express Server<br/>Port 3000]
    
    %% Routing Decision
    Server --> RouteCheck{Check BACKEND<br/>Environment Variable}
    
    %% Orchestrator Path
    RouteCheck -->|"BACKEND='Orch'"| OrchestratorPath[Enhanced Orchestrator]
    
    subgraph Orchestration["Agent Orchestration System"]
        OrchestratorPath --> SlashCheck{Slash Command<br/>Present?}
        
        SlashCheck -->|"Yes<br/>routingMetadata.forceAgent"| DirectRoute[Direct Agent<br/>Routing]
        SlashCheck -->|"No"| AgentOrch[AgentOrchestrator.ts<br/>selectAgent()]
        
        AgentOrch --> Strategy{Selection<br/>Strategy}
        Strategy -->|"capability-based"| CapAnalysis[Analyze Keywords<br/>Match Capabilities]
        Strategy -->|"keyword-based"| KeywordMatch[Simple Keyword<br/>Matching]
        Strategy -->|"simple"| RoundRobin[Round-robin/<br/>First Available]
        
        CapAnalysis --> AgentSelect[Select Best Agent]
        KeywordMatch --> AgentSelect
        RoundRobin --> AgentSelect
        DirectRoute --> AgentSelect
    end
    
    %% Agent Types
    subgraph Agents["Available Agents"]
        Analytical[AnalyticalAgent<br/>📊 Data & Research]
        Creative[CreativeAgent<br/>🎨 Writing & Ideas]
        Technical[TechnicalAgent<br/>⚙️ Code & Debug]
    end
    
    AgentSelect --> Analytical
    AgentSelect --> Creative
    AgentSelect --> Technical
    
    %% Webhook Path
    RouteCheck -->|"BACKEND='n8n'"| WebhookPath[n8n Webhook Mode]
    RouteCheck -->|"BACKEND='Generic'"| GenericPath[Generic Simulation]
    
    %% Slash Command Processing
    subgraph SlashCommands["Slash Command System"]
        SCP[SlashCommandProcessor.ts<br/>processMessage()]
        SCConfig[slash-commands.json<br/>Command Definitions]
        SCS[SlashCommandService.ts<br/>Registry & Validation]
        
        WebhookPath --> SCP
        SCP --> SCConfig
        SCP --> SCS
    end
    
    %% Tools
    subgraph Tools["Available Tools"]
        WebhookTool[GenericWebhookTool.ts<br/>HTTP Requests]
        WebSearch[WebSearchTool]
        FileManager[EnhancedFileManagerTool]
        Database[DatabaseTool]
    end
    
    Analytical --> Tools
    Creative --> Tools
    Technical --> Tools
    SCP --> WebhookTool
    
    %% Storage System
    subgraph Storage["Storage System (JSONL-based)"]
        SM[StorageManager.ts<br/>Coordination Layer]
        SS[SessionStorage.ts<br/>Message JSONL Files]
        SI[SessionIndex.ts<br/>index.json<br/>Fast Lookups]
        TL[ToolLogger.ts<br/>Tool Execution Logs]
        
        SM --> SS
        SM --> SI
        SM --> TL
        
        DataFiles["/backend/data/sessions/<br/>session_*.jsonl<br/>index.json<br/>tools_*.jsonl"]
        
        SS --> DataFiles
        SI --> DataFiles
        TL --> DataFiles
    end
    
    %% Message Storage Flow
    Server -->|"Save User Message"| SM
    Analytical -->|"Save Response"| SM
    Creative -->|"Save Response"| SM
    Technical -->|"Save Response"| SM
    WebhookTool -->|"Log Execution"| TL
    
    %% Response Flow
    Analytical --> Response[Generate Response<br/>with Metadata]
    Creative --> Response
    Technical --> Response
    WebhookTool --> Response
    
    Response --> ResponseMeta[Response Metadata:<br/>_agent, _orchestration,<br/>_backend, _slashCommand]
    
    ResponseMeta --> Server
    Server -->|"HTTP Response"| API
    
    %% UI Updates
    API --> CM
    CM -->|"Update State"| UI
    UI -->|"Display Message<br/>Show Agent Avatar"| User
    
    %% Background Features
    subgraph Features["Special Features"]
        BGChat[Background Chat<br/>Non-active Sessions]
        AgentLock[Agent Lock<br/>Sticky Selection]
        CrossMem[Cross-Session<br/>Memory]
        
        CM --> BGChat
        AgentOrch --> AgentLock
        SI --> CrossMem
    end
    
    %% Config Files
    subgraph Config["Configuration"]
        ENV[.env<br/>BACKEND=Orch<br/>LLM Keys]
        StorageConfig[storage.config.ts<br/>Limits & Settings]
        
        Server --> ENV
        SM --> StorageConfig
    end

    %% Style definitions
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef backend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef agent fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef storage fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef tool fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef config fill:#f5f5f5,stroke:#424242,stroke-width:2px
    
    class UI,SCI,CM,API frontend
    class Server,OrchestratorPath,WebhookPath,GenericPath backend
    class Analytical,Creative,Technical agent
    class SM,SS,SI,TL,DataFiles storage
    class WebhookTool,WebSearch,FileManager,Database tool
    class ENV,StorageConfig,SCConfig config
```

## Key File Locations

### Frontend Files
- **UI Layer**: `/frontend/src/components/ChatUI.tsx`
- **Input Handler**: `/frontend/src/components/SlashCommandInput.tsx`
- **State Management**: `/frontend/src/hooks/useChatManager.tsx`
- **API Client**: `/frontend/src/api/chat.ts`

### Backend Files
- **Main Server**: `/backend/server.js` (lines 280-738 for chat endpoint)
- **Orchestrator**: `/backend/src/routing/AgentOrchestrator.ts`
- **Slash Commands**: `/backend/src/routing/SlashCommandProcessor.ts`
- **Storage Manager**: `/backend/src/storage/StorageManager.ts`

### Agent Files
- **Analytical**: `/backend/src/agents/individuals/AnalyticalAgent.ts`
- **Creative**: `/backend/src/agents/individuals/CreativeAgent.ts`
- **Technical**: `/backend/src/agents/individuals/TechnicalAgent.ts`

### Configuration
- **Environment**: `/backend/.env`
- **Slash Commands**: `/backend/config/slash-commands.json`
- **Storage Config**: `/backend/src/config/storage.config.ts`

### Data Storage
- **Sessions**: `/backend/data/sessions/session_*.jsonl`
- **Index**: `/backend/data/sessions/index.json`
- **Tool Logs**: `/backend/data/sessions/tools_*.jsonl`

## Message Flow Summary

1. **User Input** → ChatUI captures text
2. **Slash Command Detection** → Extracts command metadata
3. **API Request** → Sends to backend with session info
4. **Backend Routing** → Determines processing path (Orch/n8n/Generic)
5. **Agent Selection** → Via orchestration or direct routing
6. **Processing** → Agent processes with available tools
7. **Storage** → Messages saved to JSONL files
8. **Response** → Returns with metadata
9. **UI Update** → Displays message with agent indicator

## Webhook Integration

When using slash commands with webhooks:
1. Command maps to webhook URL in config
2. SlashCommandProcessor creates webhook request
3. GenericWebhookTool executes HTTP call
4. Response returned as bot message
5. Execution logged in tools JSONL file