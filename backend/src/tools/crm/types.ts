/**
 * CRM Tool Type Definitions
 * Provides type safety for Insightly CRM integration
 */

// Insightly API Response Types
export interface InsightlyContact {
  CONTACT_ID: number;
  FIRST_NAME?: string;
  LAST_NAME?: string;
  EMAIL_ADDRESS?: string;
  PHONE?: string;
  PHONE_MOBILE?: string;
  ORGANISATION_NAME?: string;
  ORGANISATION_ID?: number;
  TITLE?: string;
  DATE_CREATED_UTC?: string;
  DATE_UPDATED_UTC?: string;
  CUSTOM_FIELDS?: CustomField[];
  TAGS?: Tag[];
  ADDRESS_MAIL_STREET?: string;
  ADDRESS_MAIL_CITY?: string;
  ADDRESS_MAIL_STATE?: string;
  ADDRESS_MAIL_POSTCODE?: string;
  ADDRESS_MAIL_COUNTRY?: string;
}

export interface InsightlyOpportunity {
  OPPORTUNITY_ID: number;
  OPPORTUNITY_NAME: string;
  OPPORTUNITY_DETAILS?: string;
  PROBABILITY?: number;
  BID_AMOUNT?: number;
  BID_CURRENCY?: string;
  BID_DURATION?: number;
  BID_TYPE?: string;
  OPPORTUNITY_VALUE?: number;
  OPPORTUNITY_STATE: 'OPEN' | 'ABANDONED' | 'LOST' | 'SUSPENDED' | 'WON';
  STAGE_ID?: number;
  PIPELINE_ID?: number;
  RESPONSIBLE_USER_ID?: number;
  ORGANISATION_ID?: number;
  CONTACT_ID?: number;
  DATE_CREATED_UTC?: string;
  DATE_UPDATED_UTC?: string;
  FORECAST_CLOSE_DATE?: string;
  ACTUAL_CLOSE_DATE?: string;
  CUSTOM_FIELDS?: CustomField[];
  TAGS?: Tag[];
}

export interface InsightlyLead {
  LEAD_ID: number;
  FIRST_NAME?: string;
  LAST_NAME?: string;
  EMAIL?: string;
  PHONE?: string;
  MOBILE?: string;
  ORGANISATION_NAME?: string;
  TITLE?: string;
  LEAD_SOURCE_ID?: number;
  LEAD_STATUS_ID?: number;
  LEAD_RATING?: number;
  CONVERTED_CONTACT_ID?: number;
  CONVERTED_OPPORTUNITY_ID?: number;
  CONVERTED_ORGANISATION_ID?: number;
  DATE_CREATED_UTC?: string;
  DATE_UPDATED_UTC?: string;
  CUSTOM_FIELDS?: CustomField[];
  TAGS?: Tag[];
}

export interface InsightlyPipeline {
  PIPELINE_ID: number;
  PIPELINE_NAME: string;
  FOR_OPPORTUNITIES: boolean;
  FOR_PROJECTS: boolean;
  OWNER_USER_ID: number;
  PIPELINE_STAGES?: PipelineStage[];
}

export interface PipelineStage {
  STAGE_ID: number;
  STAGE_NAME: string;
  STAGE_ORDER: number;
  ACTIVITYSET_ID?: number;
}

export interface CustomField {
  CUSTOM_FIELD_ID: string;
  FIELD_VALUE: any;
}

export interface Tag {
  TAG_NAME: string;
}

// Search Parameters
export interface ContactSearchParams {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  limit?: number;
  skip?: number;
  orderBy?: string;
  // Date filtering options
  updatedAfter?: string; // ISO 8601 date format
  createdAfter?: string; // ISO 8601 date format
  updatedBefore?: string; // ISO 8601 date format
  createdBefore?: string; // ISO 8601 date format
}

export interface OpportunitySearchParams {
  name?: string;
  stageId?: number;
  pipelineId?: number;
  state?: InsightlyOpportunity['OPPORTUNITY_STATE'];
  probabilityRange?: { min: number; max: number };
  valueRange?: { min: number; max: number };
  responsibleUserId?: number;
  organisationId?: number;
  contactId?: number;
  limit?: number;
  skip?: number;
  orderBy?: string;
}

export interface LeadSearchParams {
  name?: string;
  email?: string;
  company?: string;
  statusId?: number;
  sourceId?: number;
  ratingRange?: { min: number; max: number };
  limit?: number;
  skip?: number;
  orderBy?: string;
}

// Tool-specific Types
export interface CRMToolConfig {
  apiKey: string;
  apiUrl: string;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  timeout: number;
  retryAttempts: number;
  maxPageSize: number;
}

export interface CRMSearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextSkip?: number;
}

export interface CRMApiError {
  status: number;
  message: string;
  details?: any;
}

// Enrichment Types
export interface EnrichedContact extends InsightlyContact {
  opportunityCount?: number;
  totalOpportunityValue?: number;
  lastInteractionDate?: string;
  leadScore?: number;
}

export interface EnrichedOpportunity extends InsightlyOpportunity {
  stageName?: string;
  pipelineName?: string;
  contactDetails?: Partial<InsightlyContact>;
  organisationDetails?: any;
  daysInCurrentStage?: number;
  forecastAccuracy?: number;
}

// Query Intent Types
export type QueryIntent = 
  | 'customer_lookup'
  | 'pipeline_status'
  | 'opportunity_details'
  | 'lead_information'
  | 'general_query';

export interface QueryAnalysis {
  intent: QueryIntent;
  confidence: number;
  criteria: {
    customerName?: string;
    email?: string;
    company?: string;
    opportunityId?: number;
    pipelineStage?: string;
    leadStatus?: string;
    limit?: number;
    sortBy?: string;
    needsDetails?: boolean;
  };
  suggestedActions?: string[];
}

// Response Format Types
export interface CRMResponse {
  summary: string;
  details: {
    recordType: 'contact' | 'opportunity' | 'lead' | 'mixed';
    recordCount: number;
    records: any[];
  };
  suggestions?: string[];
  relatedRecords?: {
    type: string;
    count: number;
    preview: any[];
  }[];
}