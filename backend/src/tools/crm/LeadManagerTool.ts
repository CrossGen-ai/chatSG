/**
 * Lead Manager Tool
 * Provides specialized functionality for managing and querying CRM leads
 */

import { BaseTool } from '../Tool';
import {
  ToolResult,
  ToolParams,
  ToolSchema,
  ToolContext,
  ToolConfig
} from '../Tool';
import { ValidationResult } from '../../types';
import { InsightlyApiTool } from './InsightlyApiTool';
import {
  InsightlyLead,
  LeadSearchParams,
  CRMSearchResult
} from './types';

// Extended lead type with enrichment
export interface EnrichedLead extends InsightlyLead {
  leadScore?: number;
  daysSinceCreated?: number;
  statusName?: string;
  sourceName?: string;
  display?: string;
}

export class LeadManagerTool extends BaseTool {
  private apiTool: InsightlyApiTool;

  constructor() {
    const toolConfig: ToolConfig = {
      enabled: true,
      timeout: 15000,
      retries: 2,
      cacheResults: true,
      cacheTTL: 300000 // 5 minutes
    };

    super(
      'lead-manager',
      '1.0.0',
      'Manages CRM leads with search and enrichment capabilities',
      toolConfig,
      {
        author: 'ChatSG CRM Integration',
        category: 'crm',
        tags: ['crm', 'leads', 'prospects', 'search', 'enrichment']
      }
    );

    this.apiTool = new InsightlyApiTool();
  }

  /**
   * Initialize the tool
   */
  async initialize(): Promise<void> {
    await this.apiTool.initialize();
    console.log('[LeadManagerTool] Initialized successfully');
  }

  /**
   * Search leads with intelligent query parsing
   */
  private async intelligentLeadSearch(query: string, options?: any): Promise<EnrichedLead[]> {
    // When sorting is requested, we need to fetch more records to sort properly
    const needsSorting = options?.sortBy && options.sortBy !== 'none';
    const requestedLimit = options?.limit || 20;
    
    const searchParams: LeadSearchParams = {
      // If sorting, fetch more records to ensure we get the right ones
      limit: needsSorting ? Math.max(requestedLimit * 10, 100) : requestedLimit
    };

    // Parse query for email pattern
    const emailMatch = query.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      searchParams.email = emailMatch[0];
    }

    // Parse query for company name
    const companyIndicators = ['company:', 'org:', 'organization:', 'at '];
    for (const indicator of companyIndicators) {
      const idx = query.toLowerCase().indexOf(indicator);
      if (idx !== -1) {
        searchParams.company = query.substring(idx + indicator.length).trim().split(' ')[0];
        break;
      }
    }

    // If no specific criteria found, use as name search (unless it's a wildcard)
    if (!searchParams.email && !searchParams.company) {
      // Don't set name parameter for wildcard queries - this will return all leads
      if (query.trim() !== '*' && query.trim() !== '') {
        searchParams.name = query.trim();
      }
    }

    // Add sorting if specified
    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'created_desc':
          searchParams.orderBy = 'DATE_CREATED_UTC desc';
          break;
        case 'created_asc':
          searchParams.orderBy = 'DATE_CREATED_UTC asc';
          break;
        case 'updated_desc':
          searchParams.orderBy = 'DATE_UPDATED_UTC desc';
          break;
        case 'updated_asc':
          searchParams.orderBy = 'DATE_UPDATED_UTC asc';
          break;
        case 'rating_desc':
          searchParams.orderBy = 'LEAD_RATING desc';
          break;
        case 'rating_asc':
          searchParams.orderBy = 'LEAD_RATING asc';
          break;
        default:
          searchParams.orderBy = options.sortBy;
      }
    }
    
    // Execute search
    const result = await this.apiTool.searchLeads(searchParams);
    
    // Enrich leads
    let enrichedLeads = await Promise.all(result.items.map(lead => this.enrichLead(lead)));
    
    // If we fetched extra records for sorting, apply the requested limit after sorting
    if (needsSorting && enrichedLeads.length > requestedLimit) {
      enrichedLeads = enrichedLeads.slice(0, requestedLimit);
    }
    
    return enrichedLeads;
  }

  /**
   * Enrich a lead with additional data
   */
  private async enrichLead(lead: InsightlyLead): Promise<EnrichedLead> {
    const enriched: EnrichedLead = { ...lead };

    // Calculate days since created
    if (lead.DATE_CREATED_UTC) {
      const createdDate = new Date(lead.DATE_CREATED_UTC.replace(' ', 'T') + 'Z');
      enriched.daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate lead score based on available data
    enriched.leadScore = this.calculateLeadScore(enriched);

    // Format display
    enriched.display = this.formatLeadDisplay(enriched);

    return enriched;
  }

  /**
   * Calculate a basic lead score
   */
  private calculateLeadScore(lead: EnrichedLead): number {
    let score = 50; // Base score

    // Rating contribution (0-50 points based on 1-5 rating)
    if (lead.LEAD_RATING) {
      score = lead.LEAD_RATING * 20; // 1=20, 2=40, 3=60, 4=80, 5=100
    }

    // Email present
    if (lead.EMAIL) score += 5;

    // Phone present
    if (lead.PHONE || lead.MOBILE) score += 5;

    // Organization present
    if (lead.ORGANISATION_NAME) score += 10;

    // Title present
    if (lead.TITLE) score += 5;

    // Recency bonus (newer leads get slight boost)
    if (lead.daysSinceCreated !== undefined) {
      if (lead.daysSinceCreated < 7) score += 10;
      else if (lead.daysSinceCreated < 30) score += 5;
    }

    // Not converted yet (still a lead)
    if (!lead.CONVERTED_CONTACT_ID) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Format lead for display
   */
  private formatLeadDisplay(lead: EnrichedLead): string {
    const parts: string[] = [];

    // Name
    const name = [lead.FIRST_NAME, lead.LAST_NAME].filter(n => n).join(' ');
    if (name) parts.push(`**${name}**`);

    // Title and Company
    if (lead.TITLE) parts.push(lead.TITLE);
    if (lead.ORGANISATION_NAME) parts.push(`at ${lead.ORGANISATION_NAME}`);

    // Contact info
    const contactInfo: string[] = [];
    if (lead.EMAIL) contactInfo.push(`📧 ${lead.EMAIL}`);
    if (lead.PHONE) contactInfo.push(`📞 ${lead.PHONE}`);
    if (lead.MOBILE && lead.MOBILE !== lead.PHONE) {
      contactInfo.push(`📱 ${lead.MOBILE}`);
    }
    if (contactInfo.length > 0) {
      parts.push('\n' + contactInfo.join(' | '));
    }

    // Lead info
    if (lead.leadScore !== undefined) {
      parts.push(`\n🎯 Lead Score: ${lead.leadScore}/100`);
    }
    if (lead.LEAD_RATING) {
      parts.push(`⭐ Rating: ${lead.LEAD_RATING}/5`);
    }
    if (lead.daysSinceCreated !== undefined) {
      parts.push(`📅 Added: ${lead.daysSinceCreated} days ago`);
    }

    // Conversion status
    if (lead.CONVERTED_CONTACT_ID) {
      parts.push('\n✅ Converted to Contact');
    } else {
      parts.push('\n🔄 Active Lead');
    }

    return parts.join(' ');
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
          name: 'action',
          type: 'string',
          description: 'The lead management action to perform',
          required: true,
          enum: ['search', 'getDetails', 'getScore', 'convert']
        },
        {
          name: 'query',
          type: 'string',
          description: 'Search query or lead identifier',
          required: true
        },
        {
          name: 'options',
          type: 'object',
          description: 'Additional options for the action',
          required: false,
          properties: {
            limit: { name: 'limit', type: 'number', description: 'Maximum results', required: false },
            sortBy: { name: 'sortBy', type: 'string', description: 'Sort field', required: false },
            includeConverted: { name: 'includeConverted', type: 'boolean', description: 'Include converted leads', required: false }
          }
        }
      ],
      returns: {
        type: 'object',
        description: 'Lead information with enrichment data'
      },
      examples: [
        {
          input: {
            action: 'search',
            query: '*',
            options: { sortBy: 'created_desc', limit: 1 }
          },
          output: {
            success: true,
            data: {
              leads: [
                {
                  name: 'Jane Smith',
                  email: 'jane.smith@example.com',
                  company: 'Example Corp',
                  leadScore: 85,
                  rating: 4
                }
              ],
              count: 1
            }
          },
          description: 'Get the most recently added lead'
        }
      ]
    };
  }

  /**
   * Validate parameters
   */
  validate(params: ToolParams): ValidationResult {
    const errors: string[] = [];
    
    if (!params.action) {
      errors.push('Action is required');
    } else {
      const validActions = ['search', 'getDetails', 'getScore', 'convert'];
      if (!validActions.includes(params.action)) {
        errors.push(`Invalid action: ${params.action}`);
      }
    }

    if (!params.query || typeof params.query !== 'string') {
      errors.push('Query must be a non-empty string');
    }

    if (params.options && typeof params.options !== 'object') {
      errors.push('Options must be an object');
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
      const { action, query, options = {} } = params;
      console.log(`[LeadManagerTool] Executing ${action} with query: ${query}`);
      
      // Send tool start status
      const toolId = this.sendToolStart(params, context);

      let result: any;
      
      switch (action) {
        case 'search': {
          this.sendToolProgress(`Searching for leads: "${query}"...`, {}, context);
          const leads = await this.intelligentLeadSearch(query, options);
          
          result = {
            leads: leads.map(lead => ({
              id: lead.LEAD_ID,
              name: [lead.FIRST_NAME, lead.LAST_NAME].filter(n => n).join(' '),
              email: lead.EMAIL,
              phone: lead.PHONE || lead.MOBILE,
              company: lead.ORGANISATION_NAME,
              title: lead.TITLE,
              leadScore: lead.leadScore,
              rating: lead.LEAD_RATING,
              daysSinceCreated: lead.daysSinceCreated,
              converted: !!lead.CONVERTED_CONTACT_ID,
              display: lead.display
            })),
            count: leads.length,
            hasMore: leads.length === (options.limit || 20)
          };
          break;
        }

        case 'getDetails': {
          // If query is numeric, treat as ID
          const leadId = parseInt(query);
          if (!isNaN(leadId)) {
            const response = await this.apiTool.execute({
              operation: 'getLead',
              params: { id: leadId }
            });
            
            if (response.success && response.data) {
              const enriched = await this.enrichLead(response.data);
              result = {
                lead: enriched,
                display: this.formatLeadDisplay(enriched)
              };
            } else {
              throw new Error('Lead not found');
            }
          } else {
            // Search by query and get first result
            const leads = await this.intelligentLeadSearch(query, { limit: 1 });
            if (leads.length > 0) {
              result = {
                lead: leads[0],
                display: this.formatLeadDisplay(leads[0])
              };
            } else {
              throw new Error('No leads found');
            }
          }
          break;
        }

        case 'getScore': {
          // Get lead and return score
          const leadId = parseInt(query);
          let lead: InsightlyLead | undefined;
          
          if (!isNaN(leadId)) {
            const response = await this.apiTool.execute({
              operation: 'getLead',
              params: { id: leadId }
            });
            lead = response.data;
          } else {
            const leads = await this.intelligentLeadSearch(query, { limit: 1 });
            lead = leads[0];
          }
          
          if (lead) {
            const enriched = await this.enrichLead(lead);
            result = {
              leadId: lead.LEAD_ID,
              leadScore: enriched.leadScore,
              factors: {
                rating: lead.LEAD_RATING,
                hasEmail: !!lead.EMAIL,
                hasPhone: !!(lead.PHONE || lead.MOBILE),
                hasCompany: !!lead.ORGANISATION_NAME,
                daysSinceCreated: enriched.daysSinceCreated,
                isActive: !lead.CONVERTED_CONTACT_ID
              }
            };
          } else {
            throw new Error('Lead not found');
          }
          break;
        }

        case 'convert': {
          throw new Error('Lead conversion not yet implemented');
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Send tool completion status
      this.sendToolResult(result, context);
      
      return {
        success: true,
        data: result,
        metadata: {
          tool: this.name,
          action,
          query,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Send tool error status
      this.sendToolError(errorMessage, context);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          tool: this.name,
          action: params.action,
          query: params.query,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.apiTool.cleanup?.();
  }
}