# CRM Data Model and Schema Documentation

This document defines the data models, schemas, and data flow patterns used in the ChatSG CRM integration system.

## Table of Contents

- [Overview](#overview)
- [Insightly API Data Models](#insightly-api-data-models)
- [Internal Data Schemas](#internal-data-schemas)
- [Workflow State Models](#workflow-state-models)
- [Storage Schema](#storage-schema)
- [Data Transformations](#data-transformations)
- [Data Validation](#data-validation)
- [API Response Formats](#api-response-formats)
- [Error Schemas](#error-schemas)
- [Data Relationships](#data-relationships)

## Overview

The CRM system handles data from multiple sources and transforms it through various stages:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Insightly API  │───▶│ CRM Agent State │───▶│ ChatSG Storage  │
│   (External)    │    │   (Internal)    │    │   (Persistent)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Contact Data   │    │ Query Analysis  │    │ Message Logs    │
│ Opportunity Data│    │ Tool Plans      │    │ Session Index   │
│ Pipeline Info   │    │ Retrieved Data  │    │ Tool Logs       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Stages

1. **Input Validation**: User queries sanitized and validated
2. **LLM Analysis**: Query understanding and intent extraction
3. **API Transformation**: Internal requests mapped to Insightly API format
4. **Data Retrieval**: Raw API responses from Insightly
5. **Processing**: Data enrichment and relationship building
6. **Response Formatting**: Final user-friendly presentation
7. **Storage**: Persistent logging and session management

## Insightly API Data Models

### Contact Schema

```typescript
interface InsightlyContact {
  CONTACT_ID: number;
  FIRST_NAME?: string;
  LAST_NAME?: string;
  EMAIL_ADDRESS?: string;
  PHONE?: string;
  MOBILE_PHONE?: string;
  FAX?: string;
  WEBSITE?: string;
  
  // Organization
  ORGANISATION_NAME?: string;
  TITLE?: string;
  
  // Address Information
  ADDRESS_STREET?: string;
  ADDRESS_CITY?: string;
  ADDRESS_STATE?: string;
  ADDRESS_POSTCODE?: string;
  ADDRESS_COUNTRY?: string;
  
  // Timestamps
  DATE_CREATED_UTC: string; // ISO 8601
  DATE_UPDATED_UTC: string; // ISO 8601
  
  // Metadata
  OWNER_USER_ID?: number;
  VISIBLE_TO: 'Everyone' | 'Owner' | 'Team';
  VISIBLE_TEAM_ID?: number;
  VISIBLE_USER_IDS?: string; // Comma-separated IDs
  
  // Social
  SOCIAL_LINKEDIN?: string;
  SOCIAL_FACEBOOK?: string;
  SOCIAL_TWITTER?: string;
  
  // Custom Fields (variable)
  CUSTOMFIELDS?: Array<{
    FIELD_NAME: string;
    FIELD_VALUE: any;
    CUSTOM_FIELD_ID: string;
  }>;
  
  // Tags
  TAGS?: Array<{
    TAG_NAME: string;
  }>;
  
  // Links to other objects
  LINKS?: Array<{
    LINK_ID: number;
    OBJECT_NAME: string;
    OBJECT_ID: number;
    LINK_OBJECT_NAME: string;
    LINK_OBJECT_ID: number;
    ROLE?: string;
  }>;
}
```

### Opportunity Schema

```typescript
interface InsightlyOpportunity {
  OPPORTUNITY_ID: number;
  OPPORTUNITY_NAME: string;
  OPPORTUNITY_DETAILS?: string;
  
  // Financial
  OPPORTUNITY_VALUE?: number;
  BID_CURRENCY: string; // 3-letter currency code
  BID_AMOUNT?: number;
  BID_TYPE?: string;
  BID_DURATION?: number;
  
  // Probability & Status
  PROBABILITY?: number; // 0-100
  FORECAST_CLOSE_DATE?: string; // YYYY-MM-DD
  ACTUAL_CLOSE_DATE?: string; // YYYY-MM-DD
  
  // Stage Information
  STAGE_ID?: number;
  PIPELINE_ID?: number;
  CATEGORY_ID?: number;
  
  // Ownership
  OWNER_USER_ID?: number;
  RESPONSIBLE_USER_ID?: number;
  
  // Timestamps
  DATE_CREATED_UTC: string;
  DATE_UPDATED_UTC: string;
  
  // Visibility
  VISIBLE_TO: 'Everyone' | 'Owner' | 'Team';
  VISIBLE_TEAM_ID?: number;
  VISIBLE_USER_IDS?: string;
  
  // Related Objects
  ORGANISATION_ID?: number;
  CONTACT_IDS?: string; // Comma-separated
  
  // Custom Fields
  CUSTOMFIELDS?: Array<{
    FIELD_NAME: string;
    FIELD_VALUE: any;
    CUSTOM_FIELD_ID: string;
  }>;
  
  // Tags
  TAGS?: Array<{
    TAG_NAME: string;
  }>;
  
  // State
  OPPORTUNITY_STATE: 'Open' | 'Won' | 'Lost' | 'Suspended';
  OPPORTUNITY_STATE_REASON_ID?: number;
}
```

### Pipeline Schema

```typescript
interface InsightlyPipeline {
  PIPELINE_ID: number;
  PIPELINE_NAME: string;
  FOR_OPPORTUNITIES: boolean;
  FOR_PROJECTS: boolean;
  OWNER_USER_ID: number;
  
  STAGES: Array<{
    STAGE_ID: number;
    STAGE_NAME: string;
    STAGE_ORDER: number;
    ACTIVITYSET_ID?: number;
  }>;
}
```

### Organization Schema

```typescript
interface InsightlyOrganisation {
  ORGANISATION_ID: number;
  ORGANISATION_NAME: string;
  BACKGROUND?: string;
  
  // Contact Information
  PHONE?: string;
  PHONE_FAX?: string;
  WEBSITE?: string;
  
  // Address
  ADDRESS_BILLING_STREET?: string;
  ADDRESS_BILLING_CITY?: string;
  ADDRESS_BILLING_STATE?: string;
  ADDRESS_BILLING_POSTCODE?: string;
  ADDRESS_BILLING_COUNTRY?: string;
  
  ADDRESS_SHIP_STREET?: string;
  ADDRESS_SHIP_CITY?: string;
  ADDRESS_SHIP_STATE?: string;
  ADDRESS_SHIP_POSTCODE?: string;
  ADDRESS_SHIP_COUNTRY?: string;
  
  // Timestamps
  DATE_CREATED_UTC: string;
  DATE_UPDATED_UTC: string;
  
  // Ownership
  OWNER_USER_ID?: number;
  VISIBLE_TO: 'Everyone' | 'Owner' | 'Team';
  VISIBLE_TEAM_ID?: number;
  VISIBLE_USER_IDS?: string;
  
  // Social
  SOCIAL_LINKEDIN?: string;
  SOCIAL_FACEBOOK?: string;
  SOCIAL_TWITTER?: string;
  
  // Custom Fields
  CUSTOMFIELDS?: Array<{
    FIELD_NAME: string;
    FIELD_VALUE: any;
    CUSTOM_FIELD_ID: string;
  }>;
  
  // Tags
  TAGS?: Array<{
    TAG_NAME: string;
  }>;
}
```

## Internal Data Schemas

### CRM Workflow State

```typescript
interface CRMWorkflowState {
  // Core message flow
  messages: Array<HumanMessage | AIMessage | SystemMessage>;
  sessionId: string;
  currentStage: CRMWorkflowStage;
  
  // Query Understanding (LLM-driven)
  queryUnderstanding?: {
    userIntent: QueryIntent;
    extractedInfo: ExtractedEntityInfo;
    searchStrategy: SearchStrategyPlan;
    confidence: number; // 0.0 - 1.0
  };
  
  // Tool Orchestration (LLM-driven)
  toolOrchestrationPlan?: {
    toolSequence: Array<ToolExecutionStep>;
    expectedOutcome: string;
    reasoning: string;
  };
  
  // Retrieved Data
  retrievedData?: {
    contacts?: InsightlyContact[];
    opportunities?: InsightlyOpportunity[];
    organisations?: InsightlyOrganisation[];
    pipelines?: InsightlyPipeline[];
  };
  
  // Execution Metadata
  toolsUsed: string[];
  errors: string[];
  confidenceScore: number; // Overall confidence in result
  processingTime?: number; // Milliseconds
  
  // Final Response
  response?: string;
  responseMetadata?: {
    formatted: boolean;
    dataQuality: DataQualityMetrics;
    completeness: number; // 0.0 - 1.0
  };
}

type CRMWorkflowStage = 
  | 'intake' 
  | 'llm_understanding' 
  | 'tool_orchestration' 
  | 'result_processing' 
  | 'complete';

type QueryIntent = 
  | 'contact_search'
  | 'contact_details'
  | 'opportunity_search'
  | 'pipeline_analysis'
  | 'organization_lookup'
  | 'general_crm_query';
```

### Query Understanding Schema

```typescript
interface ExtractedEntityInfo {
  // Person entities
  names?: Array<{
    first?: string;
    last?: string;
    full?: string;
    confidence: number;
  }>;
  
  // Contact information
  emails?: Array<{
    address: string;
    confidence: number;
  }>;
  
  phones?: Array<{
    number: string;
    type?: 'mobile' | 'work' | 'home';
    confidence: number;
  }>;
  
  // Organization entities
  companies?: Array<{
    name: string;
    variations?: string[]; // Alternative spellings/names
    confidence: number;
  }>;
  
  // Identifiers
  identifiers?: Array<{
    type: 'contact_id' | 'opportunity_id' | 'organisation_id';
    value: string | number;
    confidence: number;
  }>;
  
  // Temporal entities
  dateRanges?: Array<{
    start?: string; // ISO 8601
    end?: string;   // ISO 8601
    description: string; // "this quarter", "last month", etc.
    confidence: number;
  }>;
  
  // Financial entities
  amounts?: Array<{
    value: number;
    currency?: string;
    context: string; // "deals over", "revenue above", etc.
    confidence: number;
  }>;
}

interface SearchStrategyPlan {
  primaryApproach: SearchApproach;
  fallbackApproaches: SearchApproach[];
  needsDetailedView: boolean;
  requiresMultiStep: boolean;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

type SearchApproach = 
  | 'exact_match'
  | 'fuzzy_search'
  | 'field_specific_search'
  | 'multi_field_search'
  | 'relationship_traversal'
  | 'aggregation_query';
```

### Tool Execution Schema

```typescript
interface ToolExecutionStep {
  toolName: string;
  operation: string;
  parameters: Record<string, any>;
  reason: string; // LLM explanation for this step
  expectedResult: string;
  
  // Execution results (populated after execution)
  executed?: boolean;
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
  retryCount?: number;
}

interface DataQualityMetrics {
  completeness: number; // 0.0 - 1.0, percentage of expected fields populated
  accuracy: number;     // 0.0 - 1.0, confidence in data accuracy
  freshness: number;    // 0.0 - 1.0, how recent the data is
  consistency: number;  // 0.0 - 1.0, consistency across related records
  
  issues?: Array<{
    type: 'missing_field' | 'stale_data' | 'inconsistent_value' | 'validation_error';
    field?: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}
```

## Storage Schema

### Session Storage (JSONL)

```typescript
// Each line in session JSONL files follows this schema
interface SessionMessage {
  // Message identification
  messageId: string;         // UUID
  sessionId: string;         // Session identifier
  timestamp: string;         // ISO 8601 timestamp
  
  // Message content
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  
  // Agent information
  agent?: string;            // Agent that processed this message
  agentVersion?: string;     // Version of the agent
  
  // CRM-specific metadata
  crmMetadata?: {
    queryType?: QueryIntent;
    toolsUsed?: string[];
    dataRetrieved?: {
      contacts?: number;       // Count of contacts retrieved
      opportunities?: number;  // Count of opportunities retrieved
      organisations?: number;  // Count of organizations retrieved
    };
    processingTime?: number;   // Milliseconds
    confidenceScore?: number;  // 0.0 - 1.0
    errors?: string[];
  };
  
  // General metadata
  metadata?: {
    userAgent?: string;
    clientId?: string;
    ipAddress?: string;       // Hashed for privacy
    responseTime?: number;
    memoryUsed?: boolean;
    streamingEnabled?: boolean;
  };
}
```

### Session Index Schema

```typescript
// Structure of data/sessions/index.json
interface SessionIndex {
  sessions: Record<string, SessionIndexEntry>;
  metadata: {
    lastUpdated: string;      // ISO 8601
    totalSessions: number;
    totalMessages: number;
    version: string;          // Index schema version
  };
}

interface SessionIndexEntry {
  sessionId: string;
  status: 'active' | 'inactive' | 'archived' | 'deleted';
  
  // Timestamps
  createdAt: string;          // ISO 8601
  lastActivity: string;       // ISO 8601
  archivedAt?: string;        // ISO 8601
  
  // Statistics
  messageCount: number;
  totalResponseTime: number;  // Milliseconds
  
  // Agent usage
  agentUsage: Record<string, number>; // agent name -> message count
  
  // CRM-specific tracking
  crmUsage?: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageProcessingTime: number;
    toolUsage: Record<string, number>; // tool name -> usage count
    queryTypes: Record<QueryIntent, number>;
  };
  
  // Data quality
  dataQuality?: {
    averageConfidence: number;
    errorRate: number;         // Percentage of queries with errors
    commonErrors: string[];    // Most frequent error types
  };
  
  // File information
  filename: string;           // JSONL filename
  fileSize: number;          // Bytes
  compressed?: boolean;       // Whether file is compressed
}
```

### Tool Execution Log Schema

```typescript
// Structure for tool-specific logging (separate JSONL files)
interface ToolExecutionLog {
  // Execution identification
  executionId: string;        // UUID
  sessionId: string;
  messageId: string;
  timestamp: string;          // ISO 8601
  
  // Tool information
  toolName: string;
  operation: string;
  version: string;           // Tool version
  
  // Request details
  request: {
    parameters: Record<string, any>;
    sanitizedParameters?: Record<string, any>; // With sensitive data removed
    validationResult?: {
      valid: boolean;
      errors?: string[];
    };
  };
  
  // Response details
  response?: {
    success: boolean;
    data?: any;               // Response data (may be truncated for large responses)
    dataSize?: number;        // Size of full response in bytes
    recordCount?: number;     // Number of records returned
    error?: string;
  };
  
  // Performance metrics
  performance: {
    startTime: string;        // ISO 8601
    endTime: string;          // ISO 8601
    duration: number;         // Milliseconds
    retryCount: number;
    rateLimitHit?: boolean;
    cacheHit?: boolean;
  };
  
  // API details (for external calls)
  apiCall?: {
    url: string;              // Sanitized URL (no query params with sensitive data)
    method: string;
    statusCode?: number;
    responseHeaders?: Record<string, string>;
    rateLimitRemaining?: number;
  };
}
```

## Data Transformations

### Input Transformation Pipeline

```typescript
interface InputTransformation {
  // Stage 1: Sanitization
  sanitize(input: string): string;
  
  // Stage 2: Validation
  validate(input: string): ValidationResult;
  
  // Stage 3: Entity extraction
  extractEntities(input: string): ExtractedEntityInfo;
  
  // Stage 4: Intent classification
  classifyIntent(input: string, entities: ExtractedEntityInfo): QueryIntent;
  
  // Stage 5: Search strategy planning
  planSearchStrategy(intent: QueryIntent, entities: ExtractedEntityInfo): SearchStrategyPlan;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    type: 'length' | 'format' | 'content' | 'security';
    message: string;
    field?: string;
  }>;
  warnings: Array<{
    type: 'ambiguous' | 'incomplete' | 'deprecated';
    message: string;
    suggestion?: string;
  }>;
}
```

### API Response Transformation

```typescript
interface ResponseTransformation {
  // Transform raw Insightly response to internal format
  transformContacts(raw: any[]): InsightlyContact[];
  transformOpportunities(raw: any[]): InsightlyOpportunity[];
  transformOrganisations(raw: any[]): InsightlyOrganisation[];
  
  // Enrich data with relationships and computed fields
  enrichContactData(contacts: InsightlyContact[]): EnrichedContact[];
  enrichOpportunityData(opportunities: InsightlyOpportunity[]): EnrichedOpportunity[];
  
  // Format for user presentation
  formatForPresentation(data: any, context: PresentationContext): FormattedResponse;
}

interface EnrichedContact extends InsightlyContact {
  // Computed fields
  fullName: string;
  primaryEmail: string;
  primaryPhone: string;
  
  // Relationships
  organisation?: InsightlyOrganisation;
  opportunities?: InsightlyOpportunity[];
  recentActivity?: Array<{
    type: string;
    date: string;
    description: string;
  }>;
  
  // Scores
  leadScore?: number;
  engagementScore?: number;
  lastContactDate?: string;
}

interface PresentationContext {
  queryType: QueryIntent;
  userRole: string;
  detailLevel: 'summary' | 'full' | 'detailed';
  format: 'text' | 'structured' | 'markdown';
  includeMetadata: boolean;
}
```

## Data Validation

### Validation Schemas

```typescript
import Joi from 'joi';

// Input validation schemas
export const validationSchemas = {
  // Chat message validation
  chatMessage: Joi.object({
    message: Joi.string()
      .min(1)
      .max(2000)
      .pattern(/^[^<>{}[\]\\]*$/) // Prevent common injection patterns
      .required(),
    sessionId: Joi.string()
      .alphanum()
      .min(8)
      .max(64)
      .required()
  }),

  // CRM search parameters
  crmSearch: Joi.object({
    searchType: Joi.string()
      .valid('contact', 'opportunity', 'organisation', 'pipeline')
      .required(),
    searchField: Joi.string()
      .valid('FIRST_NAME', 'LAST_NAME', 'EMAIL_ADDRESS', 'ORGANISATION_NAME', 'CONTACT_ID')
      .required(),
    searchValue: Joi.string()
      .min(1)
      .max(100)
      .pattern(/^[a-zA-Z0-9\s@.-]+$/)
      .required(),
    maxResults: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20)
  }),

  // Contact data validation
  contactData: Joi.object({
    CONTACT_ID: Joi.number().integer().positive().required(),
    FIRST_NAME: Joi.string().max(50).allow(''),
    LAST_NAME: Joi.string().max(50).allow(''),
    EMAIL_ADDRESS: Joi.string().email().max(254).allow(''),
    PHONE: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow(''),
    ORGANISATION_NAME: Joi.string().max(100).allow(''),
    DATE_CREATED_UTC: Joi.string().isoDate().required(),
    DATE_UPDATED_UTC: Joi.string().isoDate().required()
  }),

  // Opportunity data validation
  opportunityData: Joi.object({
    OPPORTUNITY_ID: Joi.number().integer().positive().required(),
    OPPORTUNITY_NAME: Joi.string().max(100).required(),
    OPPORTUNITY_VALUE: Joi.number().min(0).max(999999999),
    PROBABILITY: Joi.number().min(0).max(100),
    BID_CURRENCY: Joi.string().length(3).uppercase(),
    OPPORTUNITY_STATE: Joi.string()
      .valid('Open', 'Won', 'Lost', 'Suspended')
      .required(),
    DATE_CREATED_UTC: Joi.string().isoDate().required(),
    DATE_UPDATED_UTC: Joi.string().isoDate().required()
  })
};

// Runtime validation functions
export class DataValidator {
  static validateCRMResponse(data: any, type: 'contact' | 'opportunity'): ValidationResult {
    const schema = type === 'contact' ? 
      validationSchemas.contactData : 
      validationSchemas.opportunityData;
    
    const { error, value } = schema.validate(data);
    
    return {
      valid: !error,
      errors: error ? error.details.map(d => ({
        type: 'format',
        message: d.message,
        field: d.path.join('.')
      })) : [],
      warnings: []
    };
  }

  static validateSearchParameters(params: any): ValidationResult {
    const { error, value } = validationSchemas.crmSearch.validate(params);
    
    return {
      valid: !error,
      errors: error ? error.details.map(d => ({
        type: 'format',
        message: d.message,
        field: d.path.join('.')
      })) : [],
      warnings: []
    };
  }
}
```

## API Response Formats

### Standard Response Envelope

```typescript
interface CRMAPIResponse<T = any> {
  // Response metadata
  success: boolean;
  timestamp: string;         // ISO 8601
  requestId: string;         // For tracking/debugging
  
  // Data payload
  data?: T;
  
  // Error information
  error?: {
    code: string;
    message: string;
    details?: string;
    field?: string;          // Field that caused validation error
  };
  
  // Pagination (for list responses)
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  
  // Performance metadata
  performance?: {
    processingTime: number;  // Milliseconds
    cacheHit: boolean;
    rateLimitRemaining: number;
  };
  
  // Quality indicators
  quality?: {
    confidence: number;      // 0.0 - 1.0
    completeness: number;    // 0.0 - 1.0
    dataFreshness: string;   // ISO 8601 of oldest data
  };
}
```

### Contact Search Response

```typescript
interface ContactSearchResponse extends CRMAPIResponse<InsightlyContact[]> {
  searchMetadata: {
    query: string;
    searchField: string;
    strategy: SearchApproach;
    fallbacksUsed: SearchApproach[];
  };
  
  enhancedData?: {
    duplicatesFound: Array<{
      contact1: number;
      contact2: number;
      similarity: number;
    }>;
    relatedOpportunities: Record<number, number>; // contactId -> opportunityCount
    organisationCoverage: Record<string, number>; // orgName -> contactCount
  };
}
```

### Detailed Contact Response

```typescript
interface DetailedContactResponse extends CRMAPIResponse<EnrichedContact> {
  relatedData: {
    opportunities: InsightlyOpportunity[];
    organisation?: InsightlyOrganisation;
    recentActivity: Array<{
      type: 'email' | 'call' | 'meeting' | 'note';
      date: string;
      subject: string;
      details?: string;
    }>;
  };
  
  insights?: {
    leadScore: number;
    engagementLevel: 'high' | 'medium' | 'low';
    lastContactDays: number;
    opportunityValue: number;
    winRate: number;
  };
}
```

## Error Schemas

### Error Classification

```typescript
type CRMErrorType = 
  | 'validation_error'
  | 'authentication_error'  
  | 'authorization_error'
  | 'rate_limit_exceeded'
  | 'api_unavailable'
  | 'not_found'
  | 'internal_error'
  | 'llm_error'
  | 'timeout_error';

interface CRMError {
  type: CRMErrorType;
  code: string;             // Machine-readable error code
  message: string;          // Human-readable error message
  details?: string;         // Additional error context
  
  // Request context
  requestId?: string;
  timestamp: string;        // ISO 8601
  sessionId?: string;
  
  // Technical details (for debugging)
  stackTrace?: string;      // Only in development
  apiResponse?: {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  };
  
  // Recovery suggestions
  retryable: boolean;
  retryAfter?: number;      // Seconds to wait before retry
  suggestions?: string[];   // What user can try differently
}
```

### Error Response Examples

```typescript
// Rate limit exceeded
const rateLimitError: CRMError = {
  type: 'rate_limit_exceeded',
  code: 'CRM_RATE_LIMIT_001',
  message: 'Too many CRM requests. Please wait before trying again.',
  details: 'You have exceeded the limit of 10 requests per 2 minutes.',
  retryable: true,
  retryAfter: 120,
  suggestions: [
    'Wait 2 minutes before making another request',
    'Combine multiple queries into a single request'
  ],
  timestamp: '2025-07-06T12:34:56Z'
};

// API authentication failure
const authError: CRMError = {
  type: 'authentication_error',
  code: 'CRM_AUTH_001',
  message: 'CRM authentication failed',
  details: 'The Insightly API key is invalid or expired',
  retryable: false,
  suggestions: [
    'Contact administrator to verify CRM configuration',
    'Check if API key needs renewal'
  ],
  timestamp: '2025-07-06T12:34:56Z'
};

// LLM processing failure
const llmError: CRMError = {
  type: 'llm_error',
  code: 'CRM_LLM_001',
  message: 'Unable to understand the CRM query',
  details: 'The language model failed to extract entities from the user input',
  retryable: true,
  suggestions: [
    'Try rephrasing your question more specifically',
    'Include specific contact names or company names',
    'Use simpler language in your query'
  ],
  timestamp: '2025-07-06T12:34:56Z'
};
```

## Data Relationships

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Organisation  │────▶│     Contact     │────▶│   Opportunity   │
│                 │     │                 │     │                 │
│ • ORGANISATION_ID│     │ • CONTACT_ID    │     │ • OPPORTUNITY_ID│
│ • NAME          │     │ • FIRST_NAME    │     │ • NAME          │
│ • PHONE         │     │ • LAST_NAME     │     │ • VALUE         │
│ • ADDRESS       │     │ • EMAIL         │     │ • PROBABILITY   │
│ • WEBSITE       │     │ • PHONE         │     │ • STAGE         │
└─────────────────┘     │ • ORGANISATION_ID│     │ • CONTACT_IDS   │
                        └─────────────────┘     └─────────────────┘
                                │                        │
                                │                        │
                                ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │    Activity     │     │    Pipeline     │
                        │                 │     │                 │
                        │ • ACTIVITY_ID   │     │ • PIPELINE_ID   │
                        │ • TYPE          │     │ • NAME          │
                        │ • DATE          │     │ • STAGES[]      │
                        │ • CONTACT_ID    │     │ • FOR_OPPS      │
                        │ • OPPORTUNITY_ID│     └─────────────────┘
                        └─────────────────┘
```

### Relationship Mapping

```typescript
interface CRMRelationships {
  // One-to-Many relationships
  organisationToContacts: Map<number, number[]>;    // ORG_ID -> CONTACT_IDs
  contactToOpportunities: Map<number, number[]>;    // CONTACT_ID -> OPP_IDs
  pipelineToOpportunities: Map<number, number[]>;   // PIPELINE_ID -> OPP_IDs
  
  // Many-to-Many relationships  
  opportunityToContacts: Map<number, number[]>;     // OPP_ID -> CONTACT_IDs
  contactToOpportunities: Map<number, number[]>;    // CONTACT_ID -> OPP_IDs
  
  // Computed relationships
  organisationOpportunities: Map<number, {          // ORG_ID -> aggregated data
    totalValue: number;
    averageProbability: number;
    activeCount: number;
    wonCount: number;
    lostCount: number;
  }>;
  
  contactEngagement: Map<number, {                  // CONTACT_ID -> engagement metrics
    lastActivity: string;
    activityCount: number;
    responseRate: number;
    preferredChannel: string;
  }>;
}
```

This comprehensive data model documentation provides the foundation for understanding how data flows through the CRM system, from external API formats to internal processing schemas and final storage patterns. All components should validate against these schemas to ensure data consistency and system reliability.