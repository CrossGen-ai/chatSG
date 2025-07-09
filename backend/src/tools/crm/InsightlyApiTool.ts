/**
 * Insightly API Base Tool
 * Provides core API client functionality with rate limiting and error handling
 * 
 * @see https://api.insightly.com/v3.1/Help - Official API Documentation
 * @see backend/docs/crm-api-reference.md - Our implementation guide
 * 
 * IMPORTANT API REQUIREMENTS:
 * - Authentication: Basic auth with API key as username, empty password
 * - Search: Use /Search endpoints with field_name/field_value parameters
 * - Pagination: Use 'top' and 'skip' parameters (NOT $top/$skip)
 * - NO OData: Insightly does not support $filter, $orderby, etc.
 * - Rate Limiting: Implement delays between requests
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { BaseTool } from '../Tool';
import {
  ToolResult,
  ToolParams,
  ToolSchema,
  ToolContext,
  ToolConfig,
  ToolParameter
} from '../Tool';
import { ValidationResult } from '../../types';
import {
  CRMToolConfig,
  InsightlyContact,
  InsightlyOpportunity,
  InsightlyLead,
  ContactSearchParams,
  OpportunitySearchParams,
  LeadSearchParams,
  CRMSearchResult,
  CRMApiError
} from './types';
import { getCRMConfig, maskApiKey, getConfigSummary } from './config';
import { validateEndpointCompliance, validateAuthCompliance, logComplianceCheck } from './api-compliance';

// Rate limiting queue
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  request: () => Promise<any>;
}

export class InsightlyApiTool extends BaseTool {
  private client!: AxiosInstance;
  private crmConfig!: CRMToolConfig;
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = 0;
  private lastRequestTime = 0;
  private isProcessingQueue = false;

  constructor() {
    const toolConfig: ToolConfig = {
      enabled: true,
      timeout: 10000,
      retries: 3,
      cacheResults: false,
      rateLimit: {
        maxCalls: 10,
        windowMs: 1000
      }
    };

    super(
      'insightly-api',
      '1.0.0',
      'Base tool for Insightly CRM API operations with rate limiting and error handling',
      toolConfig,
      {
        author: 'ChatSG CRM Integration',
        category: 'crm',
        tags: ['crm', 'insightly', 'api', 'customer', 'sales']
      }
    );
  }

  /**
   * Initialize the API client
   */
  async initialize(): Promise<void> {
    try {
      this.crmConfig = getCRMConfig();
      console.log('[InsightlyApiTool] Initializing with config:', getConfigSummary(this.crmConfig));

      // Create basic auth with API key as username (no password per Insightly docs)
      const auth = Buffer.from(`${this.crmConfig.apiKey}:`).toString('base64');
      const authHeader = `Basic ${auth}`;
      
      // Validate authentication compliance
      const authCompliance = validateAuthCompliance(authHeader);
      logComplianceCheck('Authentication', authCompliance);
      
      if (!authCompliance.compliant) {
        throw new Error(`Auth Compliance Error: ${authCompliance.violations.join(', ')}`);
      }

      // Create axios instance
      this.client = axios.create({
        baseURL: this.crmConfig.apiUrl,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: this.crmConfig.timeout
      });

      // Add request interceptor for rate limiting
      this.client.interceptors.request.use(
        async (config) => {
          // Add request to queue and wait for processing
          return new Promise((resolve, reject) => {
            this.requestQueue.push({
              resolve: () => resolve(config),
              reject,
              request: async () => config
            });
            this.processQueue();
          });
        },
        (error) => Promise.reject(error)
      );

      // Add response interceptor for error handling
      this.client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
          return this.handleApiError(error);
        }
      );

      console.log('[InsightlyApiTool] Initialization complete');
    } catch (error) {
      console.error('[InsightlyApiTool] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = this.crmConfig.rateLimit.windowMs / this.crmConfig.rateLimit.maxRequests;

      // Wait if we need to respect rate limit
      if (timeSinceLastRequest < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
      }

      // Process next request
      const queuedRequest = this.requestQueue.shift();
      if (queuedRequest) {
        this.lastRequestTime = Date.now();
        this.activeRequests++;

        try {
          const result = await queuedRequest.request();
          queuedRequest.resolve(result);
        } catch (error) {
          queuedRequest.reject(error);
        } finally {
          this.activeRequests--;
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Handle API errors with retry logic
   */
  private async handleApiError(error: AxiosError): Promise<any> {
    const status = error.response?.status;
    const errorData = error.response?.data as any;

    // Build structured error
    const apiError: CRMApiError = {
      status: status || 0,
      message: errorData?.message || error.message || 'Unknown error',
      details: errorData
    };

    // Handle specific error cases
    switch (status) {
      case 401:
        throw new Error('Authentication failed. Please check your API key.');
      case 403:
        throw new Error('Access forbidden. Check API permissions.');
      case 429:
        // Rate limit exceeded - wait and retry
        console.warn('[InsightlyApiTool] Rate limit exceeded, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        throw new Error('Rate limit exceeded. Please try again later.');
      case 404:
        throw new Error(`Resource not found: ${error.config?.url}`);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error(`Server error (${status}): ${apiError.message}`);
      default:
        throw new Error(`API error (${status}): ${apiError.message}`);
    }
  }

  /**
   * Search for contacts
   */
  async searchContacts(params: ContactSearchParams): Promise<CRMSearchResult<InsightlyContact>> {
    const queryParams = new URLSearchParams();

    // Use Insightly's search endpoint with field_name/field_value pattern
    let endpoint = '/Contacts';
    
    if (params.email) {
      // Search by email using the search endpoint
      endpoint = '/Contacts/Search';
      queryParams.append('field_name', 'EMAIL_ADDRESS');
      queryParams.append('field_value', params.email);
    } else if (params.name) {
      // For name search, try FIRST_NAME first, but we might need to do multiple searches
      endpoint = '/Contacts/Search';
      queryParams.append('field_name', 'FIRST_NAME');
      queryParams.append('field_value', params.name);
    } else if (params.company) {
      // Search by organization name
      endpoint = '/Contacts/Search';
      queryParams.append('field_name', 'ORGANISATION_NAME');
      queryParams.append('field_value', params.company);
    } else if (params.phone) {
      // Search by phone
      endpoint = '/Contacts/Search';
      queryParams.append('field_name', 'PHONE');
      queryParams.append('field_value', params.phone);
    }
    // If no specific search criteria, get all contacts with optional date filtering

    // Apply date filtering (only works on base /Contacts endpoint, not /Search)
    if (endpoint === '/Contacts') {
      if (params.updatedAfter) {
        queryParams.append('updated_after_utc', params.updatedAfter);
      }
      if (params.createdAfter) {
        // Note: API may not support created_after_utc, but let's try
        queryParams.append('created_after_utc', params.createdAfter);
      }
    }

    // Apply pagination
    const limit = Math.min(params.limit || this.crmConfig.maxPageSize, this.crmConfig.maxPageSize);
    queryParams.append('top', limit.toString());
    if (params.skip) {
      queryParams.append('skip', params.skip.toString());
    }

    // Validate API compliance
    const complianceResult = validateEndpointCompliance(endpoint, queryParams);
    logComplianceCheck(`searchContacts: ${endpoint}`, complianceResult);
    
    if (!complianceResult.compliant) {
      throw new Error(`API Compliance Error: ${complianceResult.violations.join(', ')}`);
    }

    // Debug log the query parameters
    console.log('[InsightlyApiTool] Searching contacts with params:', {
      endpoint,
      limit,
      searchField: queryParams.get('field_name'),
      searchValue: queryParams.get('field_value'),
      fullUrl: `${endpoint}?${queryParams}`
    });
    
    // Execute request
    const response = await this.client.get<InsightlyContact[]>(`${endpoint}?${queryParams}`);
    
    let items = response.data;
    
    // Apply client-side sorting if requested (since API doesn't support orderBy)
    if (params.orderBy && items.length > 0) {
      const [field, direction] = params.orderBy.split(' ');
      const isDesc = direction?.toLowerCase() === 'desc';
      
      console.log(`[InsightlyApiTool] Sorting ${items.length} contacts by ${field} ${direction}`);
      
      items = [...items].sort((a, b) => {
        let aVal: any;
        let bVal: any;
        
        // Map common sort fields
        switch (field.toUpperCase()) {
          case 'DATE_CREATED_UTC':
            // Handle Insightly date format: "2016-10-10 20:33:00" -> ISO format
            aVal = a.DATE_CREATED_UTC ? new Date(a.DATE_CREATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            bVal = b.DATE_CREATED_UTC ? new Date(b.DATE_CREATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            break;
          case 'DATE_UPDATED_UTC':
            aVal = a.DATE_UPDATED_UTC ? new Date(a.DATE_UPDATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            bVal = b.DATE_UPDATED_UTC ? new Date(b.DATE_UPDATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            break;
          case 'FIRST_NAME':
            aVal = a.FIRST_NAME || '';
            bVal = b.FIRST_NAME || '';
            break;
          case 'LAST_NAME':
            aVal = a.LAST_NAME || '';
            bVal = b.LAST_NAME || '';
            break;
          default:
            aVal = (a as any)[field] || '';
            bVal = (b as any)[field] || '';
        }
        
        if (aVal < bVal) return isDesc ? 1 : -1;
        if (aVal > bVal) return isDesc ? -1 : 1;
        return 0;
      });
      
      // Log the first few sorted results for debugging
      console.log(`[InsightlyApiTool] Top 3 sorted results:`);
      items.slice(0, 3).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.FIRST_NAME} ${item.LAST_NAME} - Created: ${item.DATE_CREATED_UTC}`);
      });
    }
    
    return {
      items,
      total: items.length,
      hasMore: items.length === limit,
      nextSkip: params.skip ? params.skip + items.length : items.length
    };
  }

  /**
   * Search for opportunities
   */
  async searchOpportunities(params: OpportunitySearchParams): Promise<CRMSearchResult<InsightlyOpportunity>> {
    const queryParams = new URLSearchParams();
    const filters: string[] = [];

    // Build filter conditions
    if (params.name) {
      filters.push(`contains(OPPORTUNITY_NAME,'${params.name}')`);
    }
    if (params.stageId) {
      filters.push(`STAGE_ID eq ${params.stageId}`);
    }
    if (params.pipelineId) {
      filters.push(`PIPELINE_ID eq ${params.pipelineId}`);
    }
    if (params.state) {
      filters.push(`OPPORTUNITY_STATE eq '${params.state}'`);
    }
    if (params.probabilityRange) {
      filters.push(`(PROBABILITY ge ${params.probabilityRange.min} and PROBABILITY le ${params.probabilityRange.max})`);
    }
    if (params.valueRange) {
      filters.push(`(OPPORTUNITY_VALUE ge ${params.valueRange.min} and OPPORTUNITY_VALUE le ${params.valueRange.max})`);
    }
    if (params.organisationId) {
      filters.push(`ORGANISATION_ID eq ${params.organisationId}`);
    }
    if (params.contactId) {
      filters.push(`CONTACT_ID eq ${params.contactId}`);
    }

    // Apply filters
    if (filters.length > 0) {
      queryParams.append('$filter', filters.join(' and '));
    }

    // Apply pagination
    const limit = Math.min(params.limit || this.crmConfig.maxPageSize, this.crmConfig.maxPageSize);
    queryParams.append('top', limit.toString());
    if (params.skip) {
      queryParams.append('skip', params.skip.toString());
    }

    // Execute request
    const response = await this.client.get<InsightlyOpportunity[]>(`/Opportunities?${queryParams}`);
    
    return {
      items: response.data,
      total: response.data.length,
      hasMore: response.data.length === limit,
      nextSkip: params.skip ? params.skip + response.data.length : response.data.length
    };
  }

  /**
   * Search for leads
   */
  async searchLeads(params: LeadSearchParams): Promise<CRMSearchResult<InsightlyLead>> {
    const queryParams = new URLSearchParams();
    
    // Use Insightly's search endpoint with field_name/field_value pattern
    let endpoint = '/Leads';
    
    if (params.email) {
      // Search by email using the search endpoint
      endpoint = '/Leads/Search';
      queryParams.append('field_name', 'EMAIL');
      queryParams.append('field_value', params.email);
    } else if (params.name) {
      // For name search, try FIRST_NAME first
      endpoint = '/Leads/Search';
      queryParams.append('field_name', 'FIRST_NAME');
      queryParams.append('field_value', params.name);
    } else if (params.company) {
      // Search by organization name
      endpoint = '/Leads/Search';
      queryParams.append('field_name', 'ORGANISATION_NAME');
      queryParams.append('field_value', params.company);
    }
    // If no specific search criteria, get all leads

    // Apply pagination
    const limit = Math.min(params.limit || this.crmConfig.maxPageSize, this.crmConfig.maxPageSize);
    queryParams.append('top', limit.toString());
    if (params.skip) {
      queryParams.append('skip', params.skip.toString());
    }

    console.log('[InsightlyApiTool] Searching leads with params:', {
      endpoint,
      limit,
      searchField: queryParams.get('field_name'),
      searchValue: queryParams.get('field_value'),
      fullUrl: `${endpoint}?${queryParams}`
    });

    // Execute request
    const response = await this.client.get<InsightlyLead[]>(`${endpoint}?${queryParams}`);
    
    let items = response.data;
    
    // Apply client-side sorting if requested
    if (params.orderBy && items.length > 0) {
      const [field, direction] = params.orderBy.split(' ');
      const isDesc = direction?.toLowerCase() === 'desc';
      
      console.log(`[InsightlyApiTool] Sorting ${items.length} leads by ${field} ${direction}`);
      
      items = [...items].sort((a, b) => {
        let aVal: any;
        let bVal: any;
        
        switch (field.toUpperCase()) {
          case 'DATE_CREATED_UTC':
            aVal = a.DATE_CREATED_UTC ? new Date(a.DATE_CREATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            bVal = b.DATE_CREATED_UTC ? new Date(b.DATE_CREATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            break;
          case 'DATE_UPDATED_UTC':
            aVal = a.DATE_UPDATED_UTC ? new Date(a.DATE_UPDATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            bVal = b.DATE_UPDATED_UTC ? new Date(b.DATE_UPDATED_UTC.replace(' ', 'T') + 'Z').getTime() : 0;
            break;
          case 'LEAD_RATING':
            aVal = a.LEAD_RATING || 0;
            bVal = b.LEAD_RATING || 0;
            break;
          case 'FIRST_NAME':
            aVal = a.FIRST_NAME || '';
            bVal = b.FIRST_NAME || '';
            break;
          case 'LAST_NAME':
            aVal = a.LAST_NAME || '';
            bVal = b.LAST_NAME || '';
            break;
          default:
            aVal = (a as any)[field] || '';
            bVal = (b as any)[field] || '';
        }
        
        if (aVal < bVal) return isDesc ? 1 : -1;
        if (aVal > bVal) return isDesc ? -1 : 1;
        return 0;
      });
      
      // Log the first few sorted results
      console.log(`[InsightlyApiTool] Top 3 sorted leads:`);
      items.slice(0, 3).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.FIRST_NAME} ${item.LAST_NAME} - Created: ${item.DATE_CREATED_UTC}`);
      });
    }
    
    return {
      items,
      total: items.length,
      hasMore: items.length === limit,
      nextSkip: params.skip ? params.skip + items.length : items.length
    };
  }

  /**
   * Get a single lead by ID
   */
  async getLead(id: number): Promise<InsightlyLead> {
    const response = await this.client.get<InsightlyLead>(`/Leads/${id}`);
    return response.data;
  }

  /**
   * Get opportunities for a specific contact
   */
  async getContactOpportunities(contactId: number): Promise<CRMSearchResult<InsightlyOpportunity>> {
    const queryParams = new URLSearchParams();
    queryParams.append('field_name', 'CONTACT_ID');
    queryParams.append('field_value', contactId.toString());
    queryParams.append('top', '50'); // Reasonable limit for contact opportunities

    console.log('[InsightlyApiTool] Getting opportunities for contact:', {
      contactId,
      fullUrl: `/Opportunities/Search?${queryParams}`
    });

    const response = await this.client.get<InsightlyOpportunity[]>(`/Opportunities/Search?${queryParams}`);
    
    return {
      items: response.data,
      total: response.data.length,
      hasMore: response.data.length === 50,
      nextSkip: response.data.length
    };
  }

  /**
   * Get tool schema
   */
  getSchema(): ToolSchema {
    return {
      name: this.name,
      description: this.description,
      parameters: [
        {
          name: 'operation',
          type: 'string',
          description: 'The CRM operation to perform',
          required: true,
          enum: ['searchContacts', 'searchOpportunities', 'searchLeads', 'getContact', 'getContactOpportunities', 'getOpportunity', 'getLead']
        },
        {
          name: 'params',
          type: 'object',
          description: 'Parameters for the operation',
          required: true,
          properties: {
            // Search params
            name: { name: 'name', type: 'string', description: 'Name to search for', required: false },
            email: { name: 'email', type: 'string', description: 'Email to search for', required: false },
            company: { name: 'company', type: 'string', description: 'Company to search for', required: false },
            limit: { name: 'limit', type: 'number', description: 'Maximum results to return', required: false },
            skip: { name: 'skip', type: 'number', description: 'Number of results to skip', required: false },
            
            // ID params
            id: { name: 'id', type: 'number', description: 'Record ID for get operations', required: false }
          }
        }
      ],
      returns: {
        type: 'object',
        description: 'CRM operation result with data and metadata'
      },
      examples: [
        {
          input: {
            operation: 'searchContacts',
            params: { name: 'John', limit: 10 }
          },
          output: {
            success: true,
            data: {
              items: [{ CONTACT_ID: 1, FIRST_NAME: 'John', LAST_NAME: 'Doe' }],
              total: 1,
              hasMore: false
            }
          },
          description: 'Search for contacts named John'
        }
      ]
    };
  }

  /**
   * Validate parameters
   */
  validate(params: ToolParams): ValidationResult {
    const errors: string[] = [];
    
    if (!params.operation) {
      errors.push('Operation is required');
    }
    
    if (!params.params || typeof params.params !== 'object') {
      errors.push('Params must be an object');
    }

    // Validate operation-specific params
    if (params.operation && params.params) {
      const validOperations = ['searchContacts', 'searchOpportunities', 'searchLeads', 'getContact', 'getContactOpportunities', 'getOpportunity', 'getLead'];
      if (!validOperations.includes(params.operation)) {
        errors.push(`Invalid operation: ${params.operation}`);
      }

      // Validate get operations have ID
      if (params.operation.startsWith('get') && !params.params.id) {
        errors.push(`ID is required for ${params.operation}`);
      }

      // Validate search params
      if (params.operation.startsWith('search')) {
        if (params.params.limit && (params.params.limit < 1 || params.params.limit > 500)) {
          errors.push('Limit must be between 1 and 500');
        }
        if (params.params.skip && params.params.skip < 0) {
          errors.push('Skip must be non-negative');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute tool operation
   */
  async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
    try {
      const { operation, params: opParams } = params;
      const startTime = Date.now();

      console.log(`[InsightlyApiTool] Executing ${operation} with params:`, opParams);

      let result: any;
      switch (operation) {
        case 'searchContacts':
          result = await this.searchContacts(opParams);
          break;
        case 'searchOpportunities':
          result = await this.searchOpportunities(opParams);
          break;
        case 'searchLeads':
          result = await this.searchLeads(opParams);
          break;
        case 'getContact':
          result = await this.client.get(`/Contacts/${opParams.id}`);
          result = result.data;
          break;
        case 'getContactOpportunities':
          result = await this.getContactOpportunities(opParams.contactId);
          break;
        case 'getOpportunity':
          result = await this.client.get(`/Opportunities/${opParams.id}`);
          result = result.data;
          break;
        case 'getLead':
          result = await this.client.get(`/Leads/${opParams.id}`);
          result = result.data;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const executionTime = Date.now() - startTime;
      
      return this.createSuccessResult(
        result,
        `Successfully executed ${operation}`,
        {
          operation,
          executionTime,
          recordCount: Array.isArray(result.items) ? result.items.length : 1,
          timestamp: new Date().toISOString(),
          sessionId: context?.sessionId
        }
      );
      
    } catch (error) {
      console.error('[InsightlyApiTool] Execution error:', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        {
          operation: params.operation,
          timestamp: new Date().toISOString(),
          sessionId: context?.sessionId
        }
      );
    }
  }

  /**
   * Check if tool is ready
   */
  isReady(): boolean {
    return !!this.client && !!this.config;
  }

  /**
   * Get tool health status
   */
  getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string; details?: any } {
    if (!this.isReady()) {
      return {
        status: 'unhealthy',
        message: 'Tool not initialized'
      };
    }

    if (this.requestQueue.length > 50) {
      return {
        status: 'degraded',
        message: 'High request queue',
        details: {
          queueLength: this.requestQueue.length,
          activeRequests: this.activeRequests
        }
      };
    }

    return {
      status: 'healthy',
      message: 'Tool operational',
      details: {
        queueLength: this.requestQueue.length,
        activeRequests: this.activeRequests,
        apiUrl: this.crmConfig.apiUrl
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear request queue
    this.requestQueue.forEach(req => {
      req.reject(new Error('Tool cleanup in progress'));
    });
    this.requestQueue = [];
    
    console.log('[InsightlyApiTool] Cleanup complete');
  }
}