/**
 * CRM Agent Implementation
 * Specialized agent for CRM operations using LangGraph workflow
 */

import { AbstractBaseAgent } from '../../core/BaseAgent';
import {
  AgentResponse,
  StreamingCallback,
  AgentCapabilities,
  ValidationResult
} from '../../../types';
import { 
  CRMWorkflowState,
  CRMStateAnnotation,
  CRMWorkflowHelper
} from './workflow';
import { InsightlyApiTool, ContactManagerTool, OpportunityTool } from '../../../tools/crm';
import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

// Declare the require function for legacy modules
declare const require: any;

export class CRMAgent extends AbstractBaseAgent {
  private workflow: any; // Using any due to LangGraph type issues
  private apiTool: InsightlyApiTool;
  private contactTool: ContactManagerTool;
  private opportunityTool: OpportunityTool;
  private llm: any; // LLM for intelligent query analysis
  private isInitialized = false;

  constructor() {
    super(
      'CRMAgent',
      '1.0.0',
      'Specialized agent for CRM operations, customer queries, and pipeline management',
      'crm'
    );

    // Initialize tools
    this.apiTool = new InsightlyApiTool();
    this.contactTool = new ContactManagerTool();
    this.opportunityTool = new OpportunityTool();
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[CRMAgent] Initializing...');
      
      // Initialize LLM for intelligent query understanding
      try {
        const { getLLMHelper } = require('../../../../../utils/llm-helper');
        const llmHelper = getLLMHelper();
        this.llm = llmHelper.createChatLLM({
          temperature: 0.3, // Lower temperature for more consistent CRM analysis
          maxTokens: 1000
        });
        console.log('[CRMAgent] LLM initialized for AI-powered query understanding');
      } catch (llmError) {
        console.warn('[CRMAgent] LLM initialization failed, will use pattern matching only:', llmError);
        // Continue without LLM - pattern matching will still work
      }
      
      // Initialize tools
      await this.apiTool.initialize();
      await this.contactTool.initialize();
      await this.opportunityTool.initialize();

      // Create workflow
      this.workflow = await this.createWorkflowGraph();

      this.isInitialized = true;
      console.log('[CRMAgent] Initialization complete');
    } catch (error) {
      console.error('[CRMAgent] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create the workflow graph
   * Using simplified implementation due to LangGraph type issues
   */
  private async createWorkflowGraph(): Promise<any> {
    // Following the pattern from customer-support agency
    // Due to LangGraph type annotation issues, using simplified implementation
    
    return {
      invoke: async (state: CRMWorkflowState) => {
        const startTime = Date.now();
        let currentState = { ...state };

        try {
          // Execute LLM-driven workflow nodes sequentially
          currentState = await this.intakeNode(currentState);
          currentState = await this.llmUnderstandingNode(currentState);
          currentState = await this.toolOrchestrationNode(currentState);
          currentState = await this.resultProcessingNode(currentState);
          
          // Set processing time
          currentState.processingTime = Date.now() - startTime;
          currentState.currentStage = 'complete';

        } catch (error) {
          console.error('[CRMAgent] Workflow error:', error);
          currentState.errors.push(error instanceof Error ? error.message : 'Unknown error');
          currentState.currentStage = 'complete';
          
          // Generate error response
          currentState.response = 'I apologize, but I encountered an error while processing your CRM query. ' +
            'Please try rephrasing your request or contact support if the issue persists.';
        }

        return currentState;
      }
    };
  }

  /**
   * Intake node - Process initial user input
   */
  private async intakeNode(state: CRMWorkflowState): Promise<CRMWorkflowState> {
    console.log('[CRMAgent] Intake node processing...');
    
    const lastMessage = state.messages[state.messages.length - 1];
    const userInput = lastMessage.content || lastMessage;

    return {
      ...state,
      currentStage: 'llm_understanding',
      messages: [...state.messages, { 
        role: 'system', 
        content: 'Using LLM to understand your CRM query...' 
      }]
    };
  }

  /**
   * LLM Understanding Node - Use LLM to understand user intent and extract information
   */
  private async llmUnderstandingNode(state: CRMWorkflowState): Promise<CRMWorkflowState> {
    console.log('[CRMAgent] LLM Understanding node processing...');
    
    const lastUserMessage = state.messages
      .filter(m => m.role === 'user' || m instanceof HumanMessage)
      .pop();
    
    const userInput = lastUserMessage?.content || '';
    
    try {
      // Use LLM to understand the query
      const queryUnderstanding = await CRMWorkflowHelper.analyzeQueryWithLLM(userInput, this.llm);
      
      console.log('[CRMAgent] LLM Understanding result:', queryUnderstanding);
      
      return {
        ...state,
        currentStage: 'tool_orchestration',
        queryUnderstanding,
        confidenceScore: queryUnderstanding?.confidence || 0.5,
        messages: [...state.messages, { 
          role: 'system', 
          content: `Understood: ${queryUnderstanding?.userIntent || 'CRM query'}` 
        }]
      };
      
    } catch (error) {
      console.error('[CRMAgent] LLM Understanding failed:', error);
      
      // NO FALLBACK - we want to know when LLM fails!
      throw new Error(`CRM Agent LLM understanding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tool Orchestration Node - Use LLM to plan and execute API calls
   */
  private async toolOrchestrationNode(state: CRMWorkflowState): Promise<CRMWorkflowState> {
    console.log('[CRMAgent] Tool Orchestration node processing...');
    
    if (!state.queryUnderstanding) {
      console.error('[CRMAgent] No query understanding available');
      return {
        ...state,
        currentStage: 'result_processing',
        errors: [...state.errors, 'No query understanding available']
      };
    }
    
    try {
      // Use LLM to plan tool execution
      const toolPlan = await CRMWorkflowHelper.createToolOrchestrationPlan(state.queryUnderstanding, this.llm);
      
      console.log('[CRMAgent] Tool orchestration plan:', toolPlan);
      
      // Execute the tool sequence
      const retrievedData: any = {};
      const toolsUsed: string[] = [];
      
      for (const toolCall of toolPlan?.toolSequence || []) {
        console.log(`[CRMAgent] Executing ${toolCall.toolName}:`, toolCall.parameters);
        
        try {
          if (toolCall.toolName === 'searchContacts') {
            // Create context with streaming callback
            const toolContext = {
              sessionId: state.sessionId,
              agentName: 'CRMAgent',
              streamCallback: state.streamCallback
            };
            
            const result = await this.contactTool.execute({
              action: 'search',
              query: toolCall.parameters.field_value,
              options: { 
                limit: toolCall.parameters.limit || 20,
                sortBy: toolCall.parameters.sortBy
              }
            }, toolContext);
            
            if (result.success && result.data) {
              retrievedData.contacts = result.data.contacts;
              // If this is a detailed view and we found contacts, continue with detailed retrieval
              if (state.queryUnderstanding.searchStrategy.needsDetailedView && 
                  retrievedData.contacts && retrievedData.contacts.length > 0) {
                const contact = retrievedData.contacts[0];
                
                // Get detailed contact info
                const detailsResult = await this.contactTool.execute({
                  action: 'getDetails',
                  query: contact.id.toString()
                }, toolContext);
                
                if (detailsResult.success && detailsResult.data) {
                  retrievedData.contacts = [detailsResult.data.contact];
                  retrievedData.isDetailedView = true;
                  
                  // Get opportunities
                  const oppResult = await this.contactTool.execute({
                    action: 'getOpportunities',
                    query: contact.id.toString()
                  }, toolContext);
                  
                  if (oppResult.success && oppResult.data) {
                    retrievedData.contacts[0].opportunities = oppResult.data.opportunities;
                  }
                }
              }
            }
            toolsUsed.push('contact-manager');
          }
        } catch (toolError) {
          console.error(`[CRMAgent] Tool execution failed for ${toolCall.toolName}:`, toolError);
          state.errors.push(`Tool execution failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
        }
      }
      
      return {
        ...state,
        currentStage: 'result_processing',
        toolOrchestrationPlan: toolPlan,
        retrievedData,
        toolsUsed: [...state.toolsUsed, ...toolsUsed]
      };
      
    } catch (error) {
      console.error('[CRMAgent] Tool orchestration failed:', error);
      return {
        ...state,
        currentStage: 'result_processing',
        errors: [...state.errors, `Tool orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Result Processing Node - Use LLM to format the final response
   */
  private async resultProcessingNode(state: CRMWorkflowState): Promise<CRMWorkflowState> {
    console.log('[CRMAgent] Result Processing node processing...');
    
    const lastUserMessage = state.messages
      .filter(m => m.role === 'user' || m instanceof HumanMessage)
      .pop();
    
    const originalQuery = lastUserMessage?.content || '';
    
    try {
      let response: string;
      
      if (state.retrievedData && Object.keys(state.retrievedData).length > 0) {
        // Use LLM to format results
        response = await CRMWorkflowHelper.formatResultsWithLLM(
          originalQuery,
          state.queryUnderstanding,
          state.retrievedData,
          this.llm
        );
      } else if (state.errors.length > 0) {
        response = 'I encountered some issues while searching the CRM:\n' +
          state.errors.map(e => `• ${e}`).join('\n') +
          '\n\nPlease try rephrasing your query or check your search criteria.';
      } else {
        response = 'I couldn\'t find any matching records in the CRM. ' +
          'Please try:\n' +
          '• Using different search terms\n' +
          '• Checking the spelling of names or email addresses\n' +
          '• Being more specific about what you\'re looking for';
      }
      
      const responseMetadata = {
        recordCount: state.retrievedData?.contacts?.length || 0,
        dataSource: 'Insightly CRM',
        suggestions: state.toolOrchestrationPlan?.expectedOutcome ? [state.toolOrchestrationPlan.expectedOutcome] : []
      };
      
      return {
        ...state,
        currentStage: 'complete',
        response,
        responseMetadata,
        messages: [...state.messages, new AIMessage(response)]
      };
      
    } catch (error) {
      console.error('[CRMAgent] Result processing failed:', error);
      
      const errorResponse = 'I apologize, but I encountered an error while processing your CRM query. ' +
        'Please try rephrasing your request or contact support if the issue persists.';
      
      return {
        ...state,
        currentStage: 'complete',
        response: errorResponse,
        errors: [...state.errors, `Result processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        messages: [...state.messages, new AIMessage(errorResponse)]
      };
    }
  }

  /**
   * Process a message using the new LLM-driven workflow
   */
  async processMessage(input: string, sessionId: string, streamCallback?: StreamingCallback): Promise<AgentResponse> {
    try {
      // Ensure initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Build context messages with memory loading
      const systemPrompt = 'You are a CRM specialist assistant. Help users find customer information, ' +
        'analyze sales pipelines, and manage opportunities. Be concise and data-focused.';
      
      // Use buildContextMessages to load memories
      const contextMessagesRaw = await this.buildContextMessages(sessionId, input, systemPrompt);
      
      // Convert to LangChain message format
      const contextMessages = contextMessagesRaw.map(msg => {
        if (msg.role === 'system') return new SystemMessage(msg.content);
        if (msg.role === 'user') return new HumanMessage(msg.content);
        return new AIMessage(msg.content);
      });

      // Stream status message if callback available
      if (streamCallback) {
        streamCallback('[CRM Agent] Analyzing query...\n');
      }

      // Create initial state
      const initialState: CRMWorkflowState = {
        messages: contextMessages, // Already includes the user message
        sessionId,
        streamCallback, // Pass the streaming callback
        currentStage: 'intake',
        confidenceScore: 0,
        toolsUsed: [],
        errors: []
      };

      // Execute workflow
      const result = await this.workflow.invoke(initialState);

      // Stream completion message if callback available
      if (streamCallback && result.response) {
        streamCallback(result.response);
      }

      return {
        success: true,
        message: result.response || 'No response generated',
        sessionId,
        timestamp: new Date().toISOString(),
        metadata: {
          agent: 'CRMAgent',
          queryIntent: 'customer_lookup',
          confidence: result.confidenceScore,
          recordCount: result.responseMetadata?.recordCount || 0,
          toolsUsed: result.toolsUsed,
          processingTime: result.processingTime,
          errors: result.errors.length > 0 ? result.errors : undefined,
          memoryStatus: this.getMemoryStatus()
        }
      };

    } catch (error) {
      console.error('[CRMAgent] Error processing message:', error);
      return {
        success: false,
        message: 'I apologize, but I encountered an error while processing your CRM query. ' +
          'Please try again or contact support if the issue persists.',
        sessionId,
        timestamp: new Date().toISOString(),
        metadata: {
          agent: 'CRMAgent',
          error: error instanceof Error ? error.message : 'Unknown error',
          memoryStatus: this.getMemoryStatus()
        }
      };
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapabilities {
    return {
      name: 'CRMAgent',
      version: '1.0.0',
      supportedModes: ['chat', 'query'],
      features: [
        'customer-lookup',
        'contact-search', 
        'pipeline-analysis',
        'opportunity-tracking',
        'lead-management',
        'sales-forecasting',
        'data-enrichment'
      ],
      inputTypes: ['text'],
      outputTypes: ['text', 'structured-data'],
      maxSessionMemory: 50,
      supportsTools: true,
      supportsStateSharing: true
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for API key
    if (!process.env.INSIGHTLY_API_KEY) {
      errors.push('INSIGHTLY_API_KEY environment variable is required');
    }

    // Check for optional configuration
    if (!process.env.INSIGHTLY_API_URL) {
      warnings.push('INSIGHTLY_API_URL not set, using default NA region');
    }

    // Validate tools are ready
    if (!this.apiTool.isReady?.()) {
      errors.push('Insightly API tool is not ready');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('[CRMAgent] Cleaning up...');
    await this.apiTool.cleanup?.();
    await this.contactTool.cleanup?.();
    await this.opportunityTool.cleanup?.();
    this.isInitialized = false;
    console.log('[CRMAgent] Cleanup complete');
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId: string): any {
    return {
      sessionId,
      agent: 'CRMAgent',
      capabilities: this.getCapabilities()
    };
  }
}