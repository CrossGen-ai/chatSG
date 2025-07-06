/**
 * CRM Workflow Definition
 * LLM-Driven Tool Orchestration for CRM Operations (2025 LangGraph Patterns)
 */

import { Annotation } from '@langchain/langgraph';
import { QueryIntent, QueryAnalysis } from '../../../tools/crm/types';
import { StreamingCallback } from '../../../types';

/**
 * CRM Workflow State Definition
 * Updated for LLM-driven tool orchestration
 */
export interface CRMWorkflowState {
  // Core state
  messages: any[];
  sessionId: string;
  streamCallback?: StreamingCallback;
  
  // Workflow stages - LLM-driven flow
  currentStage: 'intake' | 'llm_understanding' | 'tool_orchestration' | 'result_processing' | 'complete';
  
  // LLM analysis results
  queryUnderstanding?: {
    userIntent: string;
    extractedInfo: {
      names?: string[];
      emails?: string[];
      companies?: string[];
      identifiers?: string[];
    };
    searchStrategy: {
      primaryApproach: string;
      fallbackApproaches: string[];
      needsDetailedView: boolean;
    };
    confidence: number;
  };
  
  // Tool orchestration plan
  toolOrchestrationPlan?: {
    toolSequence: Array<{
      toolName: string;
      parameters: any;
      reason: string;
    }>;
    expectedOutcome: string;
  };
  
  // Retrieved data
  retrievedData?: {
    contacts?: any[];
    opportunities?: any[];
    leads?: any[];
    pipelines?: any[];
    isDetailedView?: boolean;
  };
  
  // Enrichment results
  enrichedData?: {
    primaryRecords: any[];
    relatedRecords: any[];
    summary: string;
    insights: string[];
  };
  
  // Workflow metadata
  confidenceScore: number;
  processingTime?: number;
  toolsUsed: string[];
  errors: string[];
  
  // Response
  response?: string;
  responseMetadata?: {
    recordCount: number;
    dataSource: string;
    suggestions: string[];
  };
}

/**
 * Create state annotation for LangGraph
 * Using the pattern from customer-support agency
 */
export const CRMStateAnnotation = Annotation.Root({
  messages: Annotation<any[]>({
    reducer: (left: any[], right: any) => {
      const rightArray = Array.isArray(right) ? right : [right];
      return left.concat(rightArray);
    },
    default: () => [],
  }),
  sessionId: Annotation<string>(),
  currentStage: Annotation<CRMWorkflowState['currentStage']>(),
  queryUnderstanding: Annotation<CRMWorkflowState['queryUnderstanding']>(),
  toolOrchestrationPlan: Annotation<CRMWorkflowState['toolOrchestrationPlan']>(),
  retrievedData: Annotation<CRMWorkflowState['retrievedData']>(),
  enrichedData: Annotation<CRMWorkflowState['enrichedData']>(),
  confidenceScore: Annotation<number>({
    value: (old: number, current: number) => current || old || 0,
    default: () => 0,
  }),
  processingTime: Annotation<number>(),
  toolsUsed: Annotation<string[]>({
    reducer: (left: string[], right: string[]) => [...new Set([...left, ...right])],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (left: string[], right: string[]) => [...left, ...right],
    default: () => [],
  }),
  response: Annotation<string>(),
  responseMetadata: Annotation<CRMWorkflowState['responseMetadata']>(),
});

/**
 * LLM Prompts for CRM Operations
 * These replace regex patterns with intelligent LLM understanding
 */
export const CRM_LLM_PROMPTS = {
  QUERY_UNDERSTANDING: `You are a CRM query analyzer. Analyze the user's request and extract structured information.

User Query: "{query}"

Analyze this query and return a JSON response with:
1. userIntent: What the user wants to accomplish (e.g., "find contact details", "get full profile", "search by email")
2. extractedInfo: Any specific information provided:
   - names: Array of person names mentioned
   - emails: Array of email addresses mentioned
   - companies: Array of company names mentioned
   - identifiers: Array of any other identifiers (IDs, phone numbers)
3. searchStrategy: How to best find what they want:
   - primaryApproach: The best search method to try first
   - fallbackApproaches: Alternative search methods if primary fails
   - needsDetailedView: true if they want comprehensive/full details
4. confidence: How confident you are (0-1)

Be flexible with typos and variations. Focus on understanding intent rather than exact matching.

Examples:
- "give be the full details of peter kelly" → names: ["peter kelly"], needsDetailedView: true
- "find contact peter.kelly@company.com" → emails: ["peter.kelly@company.com"]
- "search for john at Microsoft" → names: ["john"], companies: ["Microsoft"]

Return only valid JSON.`,

  TOOL_ORCHESTRATION: `You are a CRM tool orchestrator. Based on the query understanding, create a plan to execute API calls.

Query Understanding: {queryUnderstanding}

Available CRM Tools:
1. searchContacts(field_name, field_value) - Search contacts by specific field
   - field_name options: "FIRST_NAME", "LAST_NAME", "EMAIL_ADDRESS", "ORGANISATION_NAME"
   - Best for finding contacts when you have specific info
2. getContact(id) - Get full contact details by ID
   - Use when you have contact ID from previous search
3. getContactOpportunities(contact_id) - Get opportunities for a contact
   - Use for detailed views or when user wants to see deals

Create a tool execution plan with multiple strategies:

For names like "peter kelly":
- Try FIRST_NAME: "peter" (most likely to work)
- Try LAST_NAME: "kelly" (fallback)
- Try combined searches if needed

For detailed views:
- First find the contact
- Then get full details via getContact
- Then get opportunities via getContactOpportunities

Return JSON with:
{
  "toolSequence": [
    {
      "toolName": "searchContacts",
      "parameters": {"field_name": "FIRST_NAME", "field_value": "peter"},
      "reason": "Primary search by first name"
    },
    {
      "toolName": "getContact", 
      "parameters": {"id": "{{contact_id_from_previous}}"},
      "reason": "Get full contact details for detailed view"
    }
  ],
  "expectedOutcome": "Find Peter Kelly and return comprehensive profile"
}`,

  RESULT_FORMATTING: `You are a CRM response formatter. Create a user-friendly response based on the results.

Original Query: "{originalQuery}"
Query Understanding: {queryUnderstanding}
Search Results: {searchResults}

Format the response appropriately:
- For detailed views: Show comprehensive contact info, opportunities, insights
- For searches: Show list of matching contacts with key info
- For no results: Provide helpful suggestions

Be conversational and helpful. Use emojis and formatting to make it readable.
If this was a detailed view request, ensure you show comprehensive information.`
};

/**
 * LLM-Driven CRM Workflow Helper
 * Replaces regex patterns with intelligent LLM understanding
 */
export class CRMWorkflowHelper {
  /**
   * Use LLM to understand user query and extract intent
   */
  static async analyzeQueryWithLLM(input: string, llm: any): Promise<CRMWorkflowState['queryUnderstanding']> {
    try {
      const prompt = CRM_LLM_PROMPTS.QUERY_UNDERSTANDING.replace('{query}', input);
      
      const response = await llm.invoke([
        { role: 'system', content: 'You are a CRM query analyzer. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      const responseText = response.content?.toString() || '{}';
      
      // Clean and parse JSON response
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      
      console.log('[CRMWorkflowHelper] LLM Query Analysis:', parsed);
      
      return {
        userIntent: parsed.userIntent || 'Find CRM information',
        extractedInfo: parsed.extractedInfo || {},
        searchStrategy: parsed.searchStrategy || {
          primaryApproach: 'general_search',
          fallbackApproaches: [],
          needsDetailedView: false
        },
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      console.warn('[CRMWorkflowHelper] LLM analysis failed:', error);
      
      // NO FALLBACK - we want to know when LLM fails!
      throw new Error(`LLM query analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use LLM to create tool orchestration plan
   */
  static async createToolOrchestrationPlan(
    queryUnderstanding: CRMWorkflowState['queryUnderstanding'], 
    llm: any
  ): Promise<CRMWorkflowState['toolOrchestrationPlan']> {
    try {
      const prompt = CRM_LLM_PROMPTS.TOOL_ORCHESTRATION
        .replace('{queryUnderstanding}', JSON.stringify(queryUnderstanding, null, 2));
      
      const response = await llm.invoke([
        { role: 'system', content: 'You are a CRM tool orchestrator. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      
      const responseText = response.content?.toString() || '{}';
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      
      console.log('[CRMWorkflowHelper] Tool Orchestration Plan:', parsed);
      
      return {
        toolSequence: parsed.toolSequence || [],
        expectedOutcome: parsed.expectedOutcome || 'Retrieve CRM information'
      };
    } catch (error) {
      console.warn('[CRMWorkflowHelper] Tool orchestration failed:', error);
      
      // NO FALLBACK - we want to know when LLM fails!
      throw new Error(`LLM tool orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use LLM to format results
   */
  static async formatResultsWithLLM(
    originalQuery: string,
    queryUnderstanding: CRMWorkflowState['queryUnderstanding'],
    searchResults: any,
    llm: any
  ): Promise<string> {
    try {
      const prompt = CRM_LLM_PROMPTS.RESULT_FORMATTING
        .replace('{originalQuery}', originalQuery)
        .replace('{queryUnderstanding}', JSON.stringify(queryUnderstanding, null, 2))
        .replace('{searchResults}', JSON.stringify(searchResults, null, 2));
      
      const response = await llm.invoke([
        { role: 'system', content: 'You are a CRM response formatter. Be helpful and conversational.' },
        { role: 'user', content: prompt }
      ]);
      
      return response.content?.toString() || 'No results found.';
    } catch (error) {
      console.warn('[CRMWorkflowHelper] Result formatting failed:', error);
      
      // NO FALLBACK - we want to know when LLM fails!
      throw new Error(`LLM result formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format CRM data for response generation
   */
  static formatDataForResponse(data: any, intent: QueryIntent): string {
    const parts: string[] = [];

    switch (intent) {
      case 'customer_lookup':
        if (data.contacts && data.contacts.length > 0) {
          // Check if this is a detailed view
          if (data.isDetailedView && data.contacts.length > 0) {
            const contact = data.contacts[0];
            parts.push(`**Full Details for ${contact.name || 'Contact'}**\n`);
            
            // Basic info
            if (contact.display) {
              parts.push(contact.display);
            }
            
            // Add opportunities if available
            if (contact.opportunities && contact.opportunities.length > 0) {
              parts.push(`\n📊 **Opportunities (${contact.opportunities.length}):**`);
              contact.opportunities.forEach((opp: any, index: number) => {
                parts.push(`\n${index + 1}. **${opp.name || 'Unnamed Opportunity'}**`);
                if (opp.value) parts.push(`   💰 Value: $${opp.value.toLocaleString()}`);
                if (opp.stage) parts.push(`   📈 Stage: ${opp.stage}`);
                if (opp.probability) parts.push(`   🎯 Probability: ${opp.probability}%`);
                if (opp.closeDate) parts.push(`   📅 Close Date: ${new Date(opp.closeDate).toLocaleDateString()}`);
              });
              
              // Summary stats
              const totalValue = contact.opportunities.reduce((sum: number, opp: any) => sum + (opp.value || 0), 0);
              if (totalValue > 0) {
                parts.push(`\n💎 **Total Opportunity Value: $${totalValue.toLocaleString()}**`);
              }
            } else {
              parts.push('\n📊 No active opportunities');
            }
            
            // Add any additional details
            if (contact.notes) {
              parts.push(`\n📝 **Notes:** ${contact.notes}`);
            }
            if (contact.tags && contact.tags.length > 0) {
              parts.push(`\n🏷️ **Tags:** ${contact.tags.join(', ')}`);
            }
          } else if (data.contacts.length === 1) {
            // Regular single contact view
            const contact = data.contacts[0];
            parts.push(`Here's the contact you requested:\n`);
            if (contact.display) {
              parts.push(contact.display);
            }
          } else {
            // Multiple contacts - show count and list
            parts.push(`Found ${data.contacts.length} contact(s):\n`);
            data.contacts.forEach((contact: any) => {
              if (contact.display) {
                parts.push(contact.display);
              }
            });
          }
        } else {
          parts.push('No contacts found matching your criteria.');
        }
        break;

      case 'pipeline_status':
        if (data.pipelines && data.pipelines.length > 0) {
          data.pipelines.forEach((pipeline: any) => {
            if (pipeline.display) {
              parts.push(pipeline.display);
            }
          });
        } else {
          parts.push('No pipeline data available.');
        }
        break;

      case 'opportunity_details':
        if (data.opportunities && data.opportunities.length > 0) {
          parts.push(`Found ${data.opportunities.length} opportunity(ies):\n`);
          data.opportunities.forEach((opp: any) => {
            if (opp.display) {
              parts.push(opp.display);
              parts.push('\n');
            }
          });
        } else {
          parts.push('No opportunities found matching your criteria.');
        }
        break;

      case 'lead_information':
        if (data.leads && data.leads.length > 0) {
          // Special formatting for single lead (e.g., "newest lead")
          if (data.leads.length === 1) {
            const lead = data.leads[0];
            parts.push(`Here's the lead you requested:\n`);
            parts.push(`**${lead.name || 'Unknown'}**`);
            if (lead.email) parts.push(`📧 ${lead.email}`);
            if (lead.company) parts.push(`🏢 ${lead.company}`);
            if (lead.title) parts.push(`💼 ${lead.title}`);
            if (lead.phone) parts.push(`📞 ${lead.phone}`);
            if (lead.score) parts.push(`🎯 Lead Score: ${lead.score}/100`);
            if (lead.createdDate) parts.push(`📅 Added: ${new Date(lead.createdDate).toLocaleDateString()}`);
            if (lead.lastInteraction) parts.push(`⏰ Last Activity: ${new Date(lead.lastInteraction).toLocaleDateString()}`);
          } else {
            // Multiple leads - show count and list
            parts.push(`Found ${data.leads.length} lead(s):\n`);
            data.leads.forEach((lead: any) => {
              parts.push(`**${lead.name || 'Unknown'}**`);
              if (lead.email) parts.push(`📧 ${lead.email}`);
              if (lead.company) parts.push(`🏢 ${lead.company}`);
              if (lead.score) parts.push(`🎯 Score: ${lead.score}`);
              parts.push('\n');
            });
          }
        } else {
          parts.push('No leads found matching your criteria.');
        }
        break;

      default:
        parts.push('Here\'s what I found in the CRM:');
        if (data.summary) {
          parts.push(data.summary);
        }
    }

    // Add insights if available
    if (data.insights && data.insights.length > 0) {
      parts.push('\n**Insights:**');
      data.insights.forEach((insight: string) => {
        parts.push(`• ${insight}`);
      });
    }

    // Add suggestions if available
    if (data.suggestions && data.suggestions.length > 0) {
      parts.push('\n**Suggested Actions:**');
      data.suggestions.forEach((suggestion: string) => {
        parts.push(`• ${suggestion}`);
      });
    }

    return parts.join('\n');
  }
}