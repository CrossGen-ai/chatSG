/**
 * Contact Manager Tool
 * Provides specialized functionality for managing and querying CRM contacts
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
  InsightlyContact,
  ContactSearchParams,
  EnrichedContact,
  CRMSearchResult,
  InsightlyOpportunity
} from './types';

export class ContactManagerTool extends BaseTool {
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
      'contact-manager',
      '1.0.0',
      'Manages CRM contacts with enrichment and intelligent search capabilities',
      toolConfig,
      {
        author: 'ChatSG CRM Integration',
        category: 'crm',
        tags: ['crm', 'contacts', 'customers', 'search', 'enrichment']
      }
    );

    this.apiTool = new InsightlyApiTool();
  }

  /**
   * Initialize the tool
   */
  async initialize(): Promise<void> {
    await this.apiTool.initialize();
    console.log('[ContactManagerTool] Initialized successfully');
  }

  /**
   * Search contacts with intelligent query parsing
   */
  private async intelligentContactSearch(query: string, options?: any): Promise<EnrichedContact[]> {
    const searchParams: ContactSearchParams = {
      limit: options?.limit || 20
    };

    // Parse query for email pattern
    const emailMatch = query.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      searchParams.email = emailMatch[0];
    }

    // Parse query for phone pattern
    const phoneMatch = query.match(/[\d\s\-\(\)\+]{10,}/);
    if (phoneMatch) {
      searchParams.phone = phoneMatch[0].replace(/\D/g, '');
    }

    // Check for company indicators
    const companyIndicators = ['company:', 'org:', 'organization:', 'at '];
    for (const indicator of companyIndicators) {
      const idx = query.toLowerCase().indexOf(indicator);
      if (idx !== -1) {
        searchParams.company = query.substring(idx + indicator.length).trim().split(' ')[0];
        break;
      }
    }

    // If no specific criteria found, use as name search (unless it's a wildcard)
    if (!searchParams.email && !searchParams.phone && !searchParams.company) {
      // Don't set name parameter for wildcard queries - this will return all contacts
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
        default:
          // Use the sortBy value as-is if it's a valid field
          searchParams.orderBy = options.sortBy;
      }
    }
    
    // Execute search
    const result = await this.apiTool.searchContacts(searchParams);
    
    // Enrich contacts
    return Promise.all(result.items.map(contact => this.enrichContact(contact)));
  }

  /**
   * Enrich a contact with additional data
   */
  private async enrichContact(contact: InsightlyContact): Promise<EnrichedContact> {
    const enriched: EnrichedContact = { ...contact };

    try {
      // Get related opportunities
      if (contact.CONTACT_ID) {
        const opportunities = await this.apiTool.searchOpportunities({
          contactId: contact.CONTACT_ID,
          limit: 100
        });

        enriched.opportunityCount = opportunities.items.length;
        enriched.totalOpportunityValue = opportunities.items.reduce(
          (sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0),
          0
        );

        // Find last interaction
        const dates = opportunities.items
          .map(opp => opp.DATE_UPDATED_UTC || opp.DATE_CREATED_UTC)
          .filter(date => date)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
        
        if (dates.length > 0) {
          enriched.lastInteractionDate = dates[0];
        }
      }

      // Calculate basic lead score
      enriched.leadScore = this.calculateLeadScore(enriched);

    } catch (error) {
      console.warn('[ContactManagerTool] Error enriching contact:', error);
      // Continue with partial enrichment
    }

    return enriched;
  }

  /**
   * Calculate a basic lead score for a contact
   */
  private calculateLeadScore(contact: EnrichedContact): number {
    let score = 50; // Base score

    // Email present
    if (contact.EMAIL_ADDRESS) score += 10;

    // Phone present
    if (contact.PHONE || contact.PHONE_MOBILE) score += 10;

    // Organization association
    if (contact.ORGANISATION_ID) score += 15;

    // Opportunity engagement
    if (contact.opportunityCount) {
      score += Math.min(contact.opportunityCount * 5, 25);
    }

    // Opportunity value
    if (contact.totalOpportunityValue) {
      if (contact.totalOpportunityValue > 100000) score += 20;
      else if (contact.totalOpportunityValue > 50000) score += 15;
      else if (contact.totalOpportunityValue > 10000) score += 10;
      else if (contact.totalOpportunityValue > 0) score += 5;
    }

    // Recent interaction
    if (contact.lastInteractionDate) {
      const daysSinceInteraction = (Date.now() - new Date(contact.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceInteraction < 7) score += 15;
      else if (daysSinceInteraction < 30) score += 10;
      else if (daysSinceInteraction < 90) score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Format contact for display
   */
  private formatContactDisplay(contact: EnrichedContact): string {
    const parts: string[] = [];

    // Name
    const name = [contact.FIRST_NAME, contact.LAST_NAME].filter(n => n).join(' ');
    if (name) parts.push(`**${name}**`);

    // Title and Company
    if (contact.TITLE) parts.push(contact.TITLE);
    if (contact.ORGANISATION_NAME) parts.push(`at ${contact.ORGANISATION_NAME}`);

    // Contact info
    const contactInfo: string[] = [];
    if (contact.EMAIL_ADDRESS) contactInfo.push(`📧 ${contact.EMAIL_ADDRESS}`);
    if (contact.PHONE) contactInfo.push(`📞 ${contact.PHONE}`);
    if (contact.PHONE_MOBILE && contact.PHONE_MOBILE !== contact.PHONE) {
      contactInfo.push(`📱 ${contact.PHONE_MOBILE}`);
    }
    if (contactInfo.length > 0) {
      parts.push('\n' + contactInfo.join(' | '));
    }

    // Enrichment data
    if (contact.leadScore !== undefined) {
      parts.push(`\n🎯 Lead Score: ${contact.leadScore}/100`);
    }
    if (contact.opportunityCount !== undefined && contact.opportunityCount > 0) {
      parts.push(`💼 Opportunities: ${contact.opportunityCount}`);
      if (contact.totalOpportunityValue) {
        parts.push(`💰 Total Value: $${contact.totalOpportunityValue.toLocaleString()}`);
      }
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
          description: 'The contact management action to perform',
          required: true,
          enum: ['search', 'getDetails', 'getOpportunities', 'getScore']
        },
        {
          name: 'query',
          type: 'string',
          description: 'Search query or contact identifier',
          required: true
        },
        {
          name: 'options',
          type: 'object',
          description: 'Additional options for the action',
          required: false,
          properties: {
            limit: { name: 'limit', type: 'number', description: 'Maximum results', required: false },
            includeInactive: { name: 'includeInactive', type: 'boolean', description: 'Include inactive contacts', required: false },
            sortBy: { name: 'sortBy', type: 'string', description: 'Sort field', required: false }
          }
        }
      ],
      returns: {
        type: 'object',
        description: 'Contact information with enrichment data'
      },
      examples: [
        {
          input: {
            action: 'search',
            query: 'john.doe@example.com'
          },
          output: {
            success: true,
            data: {
              contacts: [
                {
                  name: 'John Doe',
                  email: 'john.doe@example.com',
                  company: 'Example Corp',
                  leadScore: 85
                }
              ],
              count: 1
            }
          },
          description: 'Search for a contact by email'
        },
        {
          input: {
            action: 'getScore',
            query: '12345'
          },
          output: {
            success: true,
            data: {
              contactId: 12345,
              leadScore: 75,
              factors: {
                hasEmail: true,
                hasPhone: true,
                opportunityCount: 3,
                recentActivity: true
              }
            }
          },
          description: 'Get lead score for a contact'
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
      const validActions = ['search', 'getDetails', 'getOpportunities', 'getScore'];
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
      console.log(`[ContactManagerTool] Executing ${action} with query: ${query}`);
      
      // Send tool start event
      this.sendToolStart(params, context);

      let result: any;
      
      switch (action) {
        case 'search': {
          this.sendToolProgress(`Searching for "${query}"...`, { action, query }, context);
          const contacts = await this.intelligentContactSearch(query, options);
          
          result = {
            contacts: contacts.map(contact => ({
              id: contact.CONTACT_ID,
              name: [contact.FIRST_NAME, contact.LAST_NAME].filter(n => n).join(' '),
              email: contact.EMAIL_ADDRESS,
              phone: contact.PHONE || contact.PHONE_MOBILE,
              company: contact.ORGANISATION_NAME,
              title: contact.TITLE,
              leadScore: contact.leadScore,
              opportunityCount: contact.opportunityCount,
              totalOpportunityValue: contact.totalOpportunityValue,
              lastInteraction: contact.lastInteractionDate,
              display: this.formatContactDisplay(contact)
            })),
            count: contacts.length,
            hasMore: contacts.length === (options.limit || 20)
          };
          break;
        }

        case 'getDetails': {
          // If query is numeric, treat as ID
          const contactId = parseInt(query);
          if (!isNaN(contactId)) {
            const response = await this.apiTool.execute({
              operation: 'getContact',
              params: { id: contactId }
            });
            
            if (response.success && response.data) {
              const enriched = await this.enrichContact(response.data);
              result = {
                contact: enriched,
                display: this.formatContactDisplay(enriched)
              };
            } else {
              throw new Error('Contact not found');
            }
          } else {
            // Search by query
            const contacts = await this.intelligentContactSearch(query);
            if (contacts.length > 0) {
              result = {
                contact: contacts[0],
                display: this.formatContactDisplay(contacts[0])
              };
            } else {
              throw new Error('No contacts found');
            }
          }
          break;
        }

        case 'getOpportunities': {
          const contactId = parseInt(query);
          if (isNaN(contactId)) {
            throw new Error('Contact ID must be numeric for getOpportunities');
          }

          const opportunities = await this.apiTool.execute({
            operation: 'getContactOpportunities',
            params: { contactId }
          });

          if (opportunities.success && opportunities.data) {
            result = {
              opportunities: opportunities.data.items,
              count: opportunities.data.items.length,
              totalValue: opportunities.data.items.reduce(
                (sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0),
                0
              )
            };
          } else {
            result = {
              opportunities: [],
              count: 0,
              totalValue: 0
            };
          }
          break;
        }

        case 'getScore': {
          // Get contact and calculate score
          const contacts = await this.intelligentContactSearch(query);
          if (contacts.length === 0) {
            throw new Error('Contact not found');
          }

          const contact = contacts[0];
          result = {
            contactId: contact.CONTACT_ID,
            contactName: [contact.FIRST_NAME, contact.LAST_NAME].filter(n => n).join(' '),
            leadScore: contact.leadScore,
            factors: {
              hasEmail: !!contact.EMAIL_ADDRESS,
              hasPhone: !!(contact.PHONE || contact.PHONE_MOBILE),
              hasOrganization: !!contact.ORGANISATION_ID,
              opportunityCount: contact.opportunityCount || 0,
              totalOpportunityValue: contact.totalOpportunityValue || 0,
              daysSinceLastInteraction: contact.lastInteractionDate
                ? Math.floor((Date.now() - new Date(contact.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24))
                : null
            }
          };
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Send tool result
      this.sendToolResult(result, context);
      
      return this.createSuccessResult(
        result,
        `Successfully executed ${action}`,
        {
          action,
          query,
          timestamp: new Date().toISOString(),
          sessionId: context?.sessionId
        }
      );

    } catch (error) {
      console.error('[ContactManagerTool] Execution error:', error);
      
      // Send tool error
      this.sendToolError(error instanceof Error ? error.message : 'Unknown error', context);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        {
          action: params.action,
          query: params.query,
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
    return this.apiTool.isReady();
  }

  /**
   * Get tool health status
   */
  getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string; details?: any } {
    return this.apiTool.getHealth();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.apiTool.cleanup();
    console.log('[ContactManagerTool] Cleanup complete');
  }
}