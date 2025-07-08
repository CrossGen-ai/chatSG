# CRM Integration Tool & Agent PRP

## Executive Summary
Implement a comprehensive CRM integration system for ChatSG that connects to Insightly CRM API, enabling read-only operations for customer queries and pipeline status checks. This will include a LangGraph-based agent and independently testable tools following ChatSG's existing architectural patterns.

## Project Context

### Current ChatSG Architecture
- **Multi-Agent System**: Sophisticated orchestration with AgentOrchestrator, BaseAgent patterns
- **Tool Integration**: Modular tool system with typed interfaces
- **Folder Structure**: Agents in `backend/src/agents/individual/`, tools in `backend/src/tools/`
- **Streaming Support**: Real-time streaming responses via SSE
- **Security**: CSRF protection, rate limiting, input validation

### Target Integration
- **CRM System**: Insightly CRM via REST API v3.1
- **Operations**: Read-only customer queries and pipeline status
- **Technology**: LangGraph StateGraph for workflow management
- **Deployment**: GCC High Azure environment with outbound API calls

## Technical Documentation & Resources

### LangGraph Documentation
- **Primary**: https://langchain-ai.github.io/langgraph/
- **StateGraph API**: https://langchain-ai.github.io/langgraph/reference/graphs/
- **Concepts**: https://langchain-ai.github.io/langgraph/concepts/low_level/
- **Key Patterns**: StateGraph with message passing, reducers, flexible control flows

### Insightly API Documentation
- **API Help**: https://api.insightly.com/v3.1/Help
- **Swagger Docs**: https://api.na1.insightly.com/v3.1/swagger/docs/v3.1
- **Rate Limits**: 10 requests/sec, daily limits based on plan
- **Authentication**: HTTP Basic with Base64 encoded API key

## Architecture Overview

### Agent Structure
```
backend/src/agents/individual/crm/
├── agent.ts           # Main CRM agent implementation
├── workflow.ts        # LangGraph StateGraph workflow
├── tools.ts          # CRM-specific tool orchestration
├── memory.ts         # CRM context and memory management
├── config.json       # Agent configuration
├── index.ts          # Module exports
└── __tests__/        # Comprehensive test suite
    ├── agent.test.ts
    ├── workflow.test.ts
    └── tools.test.ts
```

### Tool Structure
```
backend/src/tools/crm/
├── InsightlyApiTool.ts    # Base Insightly API client
├── ContactManagerTool.ts  # Contact queries and management
├── OpportunityTool.ts     # Pipeline and opportunity queries
├── LeadManagerTool.ts     # Lead qualification and scoring
├── types.ts              # Type definitions
├── config.ts             # Configuration management
├── index.ts              # Module exports
└── __tests__/            # Tool-specific tests
    ├── insightly-api.test.ts
    ├── contact-manager.test.ts
    └── opportunity.test.ts
```

## Implementation Blueprint

### 1. CRM StateGraph Workflow

```typescript
// backend/src/agents/individual/crm/workflow.ts
import { StateGraph, StateDefinition } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Define CRM workflow state
interface CRMState extends StateDefinition {
    messages: Array<HumanMessage | AIMessage>;
    sessionId: string;
    currentStage: 'intake' | 'query_analysis' | 'data_retrieval' | 'enrichment' | 'response_generation' | 'complete';
    queryIntent: 'customer_lookup' | 'pipeline_status' | 'opportunity_details' | 'lead_information' | 'general_query';
    searchCriteria: {
        customerName?: string;
        email?: string;
        company?: string;
        opportunityId?: number;
        pipelineStage?: string;
    };
    retrievedData: any;
    confidenceScore: number;
    nextAction: string;
}

export class CRMWorkflow {
    private graph: StateGraph<CRMState>;
    
    constructor() {
        this.initializeGraph();
    }
    
    private initializeGraph() {
        // State reducers for proper state management
        this.graph = new StateGraph<CRMState>({
            channels: {
                messages: {
                    value: (old: any[], new: any[]) => [...old, ...new],
                    default: () => []
                },
                sessionId: null,
                currentStage: null,
                queryIntent: null,
                searchCriteria: {
                    value: (old: any, new: any) => ({ ...old, ...new }),
                    default: () => ({})
                },
                retrievedData: null,
                confidenceScore: null,
                nextAction: null
            }
        });
        
        // Add workflow nodes
        this.graph.addNode('intake', this.intakeNode.bind(this));
        this.graph.addNode('query_analysis', this.queryAnalysisNode.bind(this));
        this.graph.addNode('data_retrieval', this.dataRetrievalNode.bind(this));
        this.graph.addNode('enrichment', this.enrichmentNode.bind(this));
        this.graph.addNode('response_generation', this.responseGenerationNode.bind(this));
        
        // Define workflow edges
        this.graph.addEdge('intake', 'query_analysis');
        this.graph.addConditionalEdges(
            'query_analysis',
            this.shouldRetrieveData.bind(this),
            {
                'retrieve': 'data_retrieval',
                'generate': 'response_generation'
            }
        );
        this.graph.addEdge('data_retrieval', 'enrichment');
        this.graph.addEdge('enrichment', 'response_generation');
        
        this.graph.setEntryPoint('intake');
    }
    
    private async intakeNode(state: CRMState): Promise<Partial<CRMState>> {
        // Extract user query and session context
        const lastMessage = state.messages[state.messages.length - 1];
        return {
            currentStage: 'query_analysis',
            sessionId: state.sessionId
        };
    }
    
    private async queryAnalysisNode(state: CRMState): Promise<Partial<CRMState>> {
        // Analyze query intent using LLM
        const analysis = await this.analyzeQueryIntent(state.messages);
        return {
            currentStage: 'data_retrieval',
            queryIntent: analysis.intent,
            searchCriteria: analysis.criteria,
            confidenceScore: analysis.confidence
        };
    }
    
    private async dataRetrievalNode(state: CRMState): Promise<Partial<CRMState>> {
        // Retrieve data from Insightly API
        const data = await this.retrieveCRMData(state.queryIntent, state.searchCriteria);
        return {
            currentStage: 'enrichment',
            retrievedData: data
        };
    }
    
    private async enrichmentNode(state: CRMState): Promise<Partial<CRMState>> {
        // Enrich data with additional context
        const enrichedData = await this.enrichData(state.retrievedData);
        return {
            currentStage: 'response_generation',
            retrievedData: enrichedData
        };
    }
    
    private async responseGenerationNode(state: CRMState): Promise<Partial<CRMState>> {
        // Generate final response
        const response = await this.generateResponse(state);
        return {
            currentStage: 'complete',
            messages: [new AIMessage(response)]
        };
    }
}
```

### 2. CRM Agent Implementation

```typescript
// backend/src/agents/individual/crm/agent.ts
import { AbstractBaseAgent } from '../../core/BaseAgent';
import { AgentResponse, StreamingCallback } from '../../../types';
import { CRMWorkflow } from './workflow';
import { CRMTools } from './tools';

export class CRMAgent extends AbstractBaseAgent {
    private workflow: CRMWorkflow;
    private tools: CRMTools;
    
    constructor() {
        super(
            'CRMAgent',
            '1.0.0',
            'Specialized agent for CRM operations, customer queries, and pipeline management',
            'crm'
        );
        
        this.workflow = new CRMWorkflow();
        this.tools = new CRMTools();
    }
    
    async initialize(): Promise<void> {
        await super.initialize();
        await this.tools.initialize();
    }
    
    async processMessage(input: string, sessionId: string, streamCallback?: StreamingCallback): Promise<AgentResponse> {
        try {
            // Build context from conversation history
            const contextMessages = await this.buildContextMessages(sessionId);
            
            // Stream status updates
            streamCallback?.onStatus({
                type: 'processing',
                message: 'Analyzing CRM query...'
            });
            
            // Execute workflow
            const result = await this.workflow.execute({
                messages: [...contextMessages, { role: 'user', content: input }],
                sessionId,
                currentStage: 'intake'
            });
            
            streamCallback?.onStatus({
                type: 'complete',
                message: 'CRM query processed successfully'
            });
            
            return {
                content: result.response,
                agent: this.name,
                confidence: result.confidence,
                metadata: {
                    queryIntent: result.queryIntent,
                    dataRetrieved: !!result.retrievedData
                }
            };
            
        } catch (error) {
            console.error('[CRMAgent] Error processing message:', error);
            
            return {
                content: 'I apologize, but I encountered an error while processing your CRM query. Please try again or contact support if the issue persists.',
                agent: this.name,
                confidence: 0,
                metadata: { error: error.message }
            };
        }
    }
    
    getCapabilities(): string[] {
        return [
            'crm-customer-lookup',
            'crm-pipeline-status',
            'crm-opportunity-details',
            'crm-lead-information',
            'crm-contact-management'
        ];
    }
}
```

### 3. Insightly API Tools

```typescript
// backend/src/tools/crm/InsightlyApiTool.ts
import { BaseTool } from '../base/BaseTool';
import { ToolResult, ToolParams, ToolSchema } from '../types';
import axios, { AxiosInstance } from 'axios';

export class InsightlyApiTool extends BaseTool {
    private client: AxiosInstance;
    private rateLimitQueue: Array<() => void> = [];
    private lastRequestTime: number = 0;
    private readonly RATE_LIMIT_MS = 100; // 10 requests per second
    
    constructor() {
        super(
            'insightly-api',
            '1.0.0',
            'Base tool for Insightly CRM API operations',
            { 
                enabled: true,
                requiresAuth: true,
                rateLimit: {
                    maxRequests: 10,
                    windowMs: 1000
                }
            }
        );
        
        this.initializeClient();
    }
    
    private initializeClient() {
        const apiKey = process.env.INSIGHTLY_API_KEY;
        if (!apiKey) {
            throw new Error('INSIGHTLY_API_KEY environment variable is required');
        }
        
        const encodedKey = Buffer.from(apiKey).toString('base64');
        
        this.client = axios.create({
            baseURL: 'https://api.na1.insightly.com/v3.1',
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        // Add rate limiting interceptor
        this.client.interceptors.request.use(async (config) => {
            await this.enforceRateLimit();
            return config;
        });
        
        // Add error handling interceptor
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                if (error.response?.status === 401) {
                    throw new Error('Invalid API key or authentication failed.');
                }
                throw error;
            }
        );
    }
    
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
            await new Promise(resolve => 
                setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest)
            );
        }
        
        this.lastRequestTime = Date.now();
    }
    
    async searchContacts(params: {
        name?: string;
        email?: string;
        company?: string;
        limit?: number;
    }): Promise<any[]> {
        const queryParams = new URLSearchParams();
        
        if (params.name) queryParams.append('$filter', `contains(FIRST_NAME,'${params.name}') or contains(LAST_NAME,'${params.name}')`);
        if (params.email) queryParams.append('$filter', `EMAIL_ADDRESS eq '${params.email}'`);
        if (params.company) queryParams.append('$filter', `contains(ORGANISATION_NAME,'${params.company}')`);
        if (params.limit) queryParams.append('$top', params.limit.toString());
        
        const response = await this.client.get(`/Contacts?${queryParams}`);
        return response.data;
    }
    
    async getOpportunities(params: {
        stageId?: number;
        probabilityRange?: { min: number; max: number };
        limit?: number;
    }): Promise<any[]> {
        const queryParams = new URLSearchParams();
        
        if (params.stageId) queryParams.append('$filter', `STAGE_ID eq ${params.stageId}`);
        if (params.probabilityRange) {
            const filter = `PROBABILITY ge ${params.probabilityRange.min} and PROBABILITY le ${params.probabilityRange.max}`;
            queryParams.append('$filter', filter);
        }
        if (params.limit) queryParams.append('$top', params.limit.toString());
        
        const response = await this.client.get(`/Opportunities?${queryParams}`);
        return response.data;
    }
    
    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['searchContacts', 'getOpportunities', 'getContact', 'getOpportunity'],
                        description: 'The CRM operation to perform'
                    },
                    params: {
                        type: 'object',
                        description: 'Parameters for the operation'
                    }
                },
                required: ['operation', 'params']
            }
        };
    }
    
    async execute(params: ToolParams): Promise<ToolResult> {
        try {
            const { operation, params: opParams } = params;
            
            let result;
            switch (operation) {
                case 'searchContacts':
                    result = await this.searchContacts(opParams);
                    break;
                case 'getOpportunities':
                    result = await this.getOpportunities(opParams);
                    break;
                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
            
            return {
                success: true,
                data: result,
                metadata: {
                    operation,
                    recordCount: Array.isArray(result) ? result.length : 1
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    operation: params.operation,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
}
```

### 4. Agent Registration

```typescript
// backend/src/routing/AgentOrchestrator.ts - Add CRM routing patterns
private routeToSpecializedAgent(input: string): string | null {
    const normalizedInput = input.toLowerCase();
    
    // Add CRM-specific patterns
    const crmPatterns = [
        'crm', 'customer', 'contact', 'lead', 'opportunity', 'deal', 'pipeline',
        'sales', 'prospect', 'account', 'client', 'insightly', 'customer status',
        'pipeline status', 'deal status', 'opportunity status', 'lead status'
    ];
    
    if (crmPatterns.some(pattern => normalizedInput.includes(pattern))) {
        return 'CRMAgent';
    }
    
    // ... existing patterns
}
```

```typescript
// backend/server.js - Register CRM agent
import { CRMAgent } from './src/agents/individual/crm/agent.js';

// Initialize CRM agent
const crmAgent = new CRMAgent();
await crmAgent.initialize();

// Register with orchestrator
orchestrator.registerAgent(crmAgent);
```

## Environment Configuration

### Required Environment Variables
```bash
# CRM Configuration
INSIGHTLY_API_KEY=your_insightly_api_key_here
INSIGHTLY_API_URL=https://api.na1.insightly.com/v3.1
CRM_RATE_LIMIT_REQUESTS=10
CRM_RATE_LIMIT_WINDOW_MS=1000

# Optional: Regional API endpoints
# INSIGHTLY_API_URL=https://api.eu1.insightly.com/v3.1  # EU region
# INSIGHTLY_API_URL=https://api.ap1.insightly.com/v3.1  # APAC region
```

### Configuration Management
```typescript
// backend/src/tools/crm/config.ts
export interface CRMConfig {
    apiKey: string;
    apiUrl: string;
    rateLimit: {
        maxRequests: number;
        windowMs: number;
    };
    timeout: number;
    retryAttempts: number;
}

export const getCRMConfig = (): CRMConfig => {
    const config = {
        apiKey: process.env.INSIGHTLY_API_KEY,
        apiUrl: process.env.INSIGHTLY_API_URL || 'https://api.na1.insightly.com/v3.1',
        rateLimit: {
            maxRequests: parseInt(process.env.CRM_RATE_LIMIT_REQUESTS || '10'),
            windowMs: parseInt(process.env.CRM_RATE_LIMIT_WINDOW_MS || '1000')
        },
        timeout: parseInt(process.env.CRM_TIMEOUT || '10000'),
        retryAttempts: parseInt(process.env.CRM_RETRY_ATTEMPTS || '3')
    };
    
    if (!config.apiKey) {
        throw new Error('INSIGHTLY_API_KEY environment variable is required');
    }
    
    return config;
};
```

## Critical Implementation Gotchas

### 1. Rate Limiting
- **Issue**: Insightly API has strict rate limits (10 requests/second)
- **Solution**: Implement request queuing with exponential backoff
- **Code Pattern**: Use interceptors and promise-based rate limiting

### 2. API Key Security
- **Issue**: API keys must not be hardcoded or logged
- **Solution**: Use environment variables and mask in logs
- **Code Pattern**: Validate at startup, use secure storage

### 3. StateGraph State Management
- **Issue**: Complex state updates can cause race conditions
- **Solution**: Use proper reducers and immutable updates
- **Code Pattern**: Define clear channel reducers for state merging

### 4. Error Handling
- **Issue**: API failures should not crash the agent
- **Solution**: Comprehensive error handling with fallbacks
- **Code Pattern**: Try-catch with graceful degradation

### 5. Memory Management
- **Issue**: Large data sets can cause memory issues
- **Solution**: Implement pagination and data streaming
- **Code Pattern**: Use generators for large result sets

## Testing Strategy

### 1. Unit Tests
```typescript
// backend/src/tools/crm/__tests__/insightly-api.test.ts
describe('InsightlyApiTool', () => {
    let tool: InsightlyApiTool;
    
    beforeEach(() => {
        tool = new InsightlyApiTool();
    });
    
    describe('searchContacts', () => {
        it('should search contacts by name', async () => {
            const mockResponse = [{ CONTACT_ID: 1, FIRST_NAME: 'John', LAST_NAME: 'Doe' }];
            jest.spyOn(tool['client'], 'get').mockResolvedValue({ data: mockResponse });
            
            const result = await tool.searchContacts({ name: 'John' });
            expect(result).toEqual(mockResponse);
        });
        
        it('should handle rate limiting', async () => {
            // Test rate limiting implementation
        });
        
        it('should handle API errors gracefully', async () => {
            // Test error handling
        });
    });
});
```

### 2. Integration Tests
```typescript
// backend/src/agents/individual/crm/__tests__/agent.test.ts
describe('CRMAgent Integration', () => {
    it('should process customer lookup queries', async () => {
        const agent = new CRMAgent();
        await agent.initialize();
        
        const response = await agent.processMessage(
            'Find customer information for john.doe@example.com',
            'test-session'
        );
        
        expect(response.content).toContain('customer');
        expect(response.agent).toBe('CRMAgent');
    });
});
```

### 3. API Mock Testing
```typescript
// backend/src/tools/crm/__tests__/api-mock.test.ts
import nock from 'nock';

describe('Insightly API Mock Tests', () => {
    beforeEach(() => {
        nock('https://api.na1.insightly.com')
            .get('/v3.1/Contacts')
            .reply(200, [{ CONTACT_ID: 1, FIRST_NAME: 'John' }]);
    });
    
    it('should work with mocked API', async () => {
        // Test with mocked responses
    });
});
```

## Implementation Task List

### Phase 1: Foundation (Week 1)
1. **Setup project structure** - Create agent and tool directories
2. **Implement base API client** - InsightlyApiTool with authentication
3. **Add rate limiting** - Implement request queuing and throttling
4. **Create configuration management** - Environment variables and config validation
5. **Write unit tests** - Basic API client functionality

### Phase 2: Core Tools (Week 2)
1. **Implement ContactManagerTool** - Contact search and retrieval
2. **Implement OpportunityTool** - Pipeline and opportunity queries
3. **Add error handling** - Comprehensive error handling and logging
4. **Create tool integration tests** - Mock API testing
5. **Implement data pagination** - Handle large result sets

### Phase 3: Agent Implementation (Week 3)
1. **Create CRM StateGraph workflow** - Define workflow stages and transitions
2. **Implement CRM agent** - Main agent class with tool integration
3. **Add query analysis** - LLM-powered intent recognition
4. **Implement streaming responses** - Real-time response streaming
5. **Add agent registration** - Integrate with orchestrator

### Phase 4: Integration & Testing (Week 4)
1. **Update orchestrator routing** - Add CRM patterns to agent selection
2. **Implement memory management** - CRM-specific context handling
3. **Add comprehensive tests** - End-to-end testing
4. **Performance optimization** - Caching and performance tuning
5. **Documentation and deployment** - API documentation and deployment guide

### Phase 5: Validation & Deployment (Week 5)
1. **Security audit** - API key security and input validation
2. **Load testing** - Rate limiting and performance testing
3. **User acceptance testing** - Test with real CRM data
4. **Monitoring setup** - Logging and error tracking
5. **Production deployment** - Deploy to GCC High Azure

## Validation Gates

### Code Quality Gates
```bash
# TypeScript compilation
npm run build

# ESLint code quality
npm run lint

# Type checking
npm run type-check
```

### Testing Gates
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# API tests (with mocks)
npm run test:api

# Coverage check (minimum 80%)
npm run test:coverage
```

### Security Gates
```bash
# Security audit
npm audit

# Check for secrets in code
npm run security:secrets

# API key validation
npm run security:config
```

### Performance Gates
```bash
# Rate limiting validation
npm run test:rate-limit

# Memory usage testing
npm run test:memory

# API response time testing
npm run test:performance
```

## Success Criteria

### Functional Requirements
- [ ] CRM agent responds to customer queries
- [ ] Pipeline status queries return accurate data
- [ ] Contact search works with various search criteria
- [ ] Opportunity data is properly formatted and relevant
- [ ] Rate limiting prevents API quota exhaustion

### Non-Functional Requirements
- [ ] Response time under 3 seconds for simple queries
- [ ] 99.9% uptime for CRM operations
- [ ] Memory usage stays under 100MB per session
- [ ] Error rate below 1% for valid queries
- [ ] API key security maintained (no logging/exposure)

### Integration Requirements
- [ ] Agent registers successfully with orchestrator
- [ ] Streaming responses work in ChatSG UI
- [ ] Tool results integrate with existing storage
- [ ] Error handling gracefully degrades
- [ ] Monitoring and logging capture all operations

## Risk Mitigation

### Technical Risks
- **API Rate Limiting**: Implement robust queuing and backoff strategies
- **Data Security**: Use environment variables and secure secret management
- **StateGraph Complexity**: Start with simple workflow, iterate to complex
- **Performance**: Implement caching and pagination from the start

### Business Risks
- **API Changes**: Monitor Insightly API versioning and deprecation notices
- **Data Privacy**: Ensure compliance with data protection regulations
- **Integration Complexity**: Use feature flags for gradual rollout
- **User Adoption**: Provide clear documentation and training

## PRP Confidence Score: 9/10

This PRP provides comprehensive context for successful one-pass implementation:

### Strengths (9/10):
- **Complete architectural context** from existing codebase analysis
- **Detailed implementation patterns** following ChatSG conventions
- **Comprehensive external documentation** with specific URLs
- **Thorough error handling** and security considerations
- **Realistic timeline** with clear milestones
- **Executable validation gates** for quality assurance
- **Risk mitigation strategies** for common pitfalls

### Areas for Enhancement (1 point deduction):
- **Performance benchmarks** could be more specific to CRM operations
- **Additional monitoring** metrics for CRM-specific operations

This PRP provides sufficient context and detail for an AI agent to successfully implement the CRM integration with high confidence of success on the first attempt.