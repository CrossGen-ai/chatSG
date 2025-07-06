/**
 * Opportunity Tool
 * Provides specialized functionality for managing and querying CRM opportunities and pipelines
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
  InsightlyOpportunity,
  InsightlyPipeline,
  OpportunitySearchParams,
  EnrichedOpportunity,
  CRMSearchResult,
  PipelineStage
} from './types';

interface PipelineAnalysis {
  pipelineId: number;
  pipelineName: string;
  stages: Array<{
    stageId: number;
    stageName: string;
    opportunityCount: number;
    totalValue: number;
    averageValue: number;
    averageDaysInStage: number;
  }>;
  summary: {
    totalOpportunities: number;
    totalValue: number;
    averageValue: number;
    conversionRate: number;
    averageSalesCycle: number;
  };
}

export class OpportunityTool extends BaseTool {
  private apiTool: InsightlyApiTool;
  private pipelineCache: Map<number, InsightlyPipeline> = new Map();

  constructor() {
    const toolConfig: ToolConfig = {
      enabled: true,
      timeout: 15000,
      retries: 2,
      cacheResults: true,
      cacheTTL: 600000 // 10 minutes
    };

    super(
      'opportunity-manager',
      '1.0.0',
      'Manages CRM opportunities with pipeline analysis and intelligent forecasting',
      toolConfig,
      {
        author: 'ChatSG CRM Integration',
        category: 'crm',
        tags: ['crm', 'opportunities', 'pipeline', 'sales', 'forecast']
      }
    );

    this.apiTool = new InsightlyApiTool();
  }

  /**
   * Initialize the tool
   */
  async initialize(): Promise<void> {
    await this.apiTool.initialize();
    console.log('[OpportunityTool] Initialized successfully');
  }

  /**
   * Get pipeline information
   */
  private async getPipeline(pipelineId: number): Promise<InsightlyPipeline | null> {
    try {
      if (this.pipelineCache.has(pipelineId)) {
        return this.pipelineCache.get(pipelineId)!;
      }

      // For now, create a mock pipeline since the API tool doesn't have getPipeline yet
      // In a real implementation, we would add getPipeline to InsightlyApiTool
      const mockPipeline: InsightlyPipeline = {
        PIPELINE_ID: pipelineId,
        PIPELINE_NAME: `Pipeline ${pipelineId}`,
        FOR_OPPORTUNITIES: true,
        FOR_PROJECTS: false,
        OWNER_USER_ID: 1,
        PIPELINE_STAGES: [
          { STAGE_ID: 1, STAGE_NAME: 'Qualification', STAGE_ORDER: 1 },
          { STAGE_ID: 2, STAGE_NAME: 'Proposal', STAGE_ORDER: 2 },
          { STAGE_ID: 3, STAGE_NAME: 'Negotiation', STAGE_ORDER: 3 },
          { STAGE_ID: 4, STAGE_NAME: 'Closed Won', STAGE_ORDER: 4 },
          { STAGE_ID: 5, STAGE_NAME: 'Closed Lost', STAGE_ORDER: 5 }
        ]
      };

      this.pipelineCache.set(pipelineId, mockPipeline);
      return mockPipeline;
    } catch (error) {
      console.warn(`[OpportunityTool] Failed to get pipeline ${pipelineId}:`, error);
    }
    return null;
  }

  /**
   * Enrich an opportunity with additional data
   */
  private async enrichOpportunity(opportunity: InsightlyOpportunity): Promise<EnrichedOpportunity> {
    const enriched: EnrichedOpportunity = { ...opportunity };

    try {
      // Get pipeline and stage information
      if (opportunity.PIPELINE_ID) {
        const pipeline = await this.getPipeline(opportunity.PIPELINE_ID);
        if (pipeline) {
          enriched.pipelineName = pipeline.PIPELINE_NAME;
          
          if (opportunity.STAGE_ID && pipeline.PIPELINE_STAGES) {
            const stage = pipeline.PIPELINE_STAGES.find(s => s.STAGE_ID === opportunity.STAGE_ID);
            if (stage) {
              enriched.stageName = stage.STAGE_NAME;
            }
          }
        }
      }

      // Calculate days in current stage
      if (opportunity.DATE_UPDATED_UTC) {
        const lastUpdate = new Date(opportunity.DATE_UPDATED_UTC);
        enriched.daysInCurrentStage = Math.floor(
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Calculate forecast accuracy (simple heuristic)
      if (opportunity.FORECAST_CLOSE_DATE && opportunity.PROBABILITY) {
        const forecastDate = new Date(opportunity.FORECAST_CLOSE_DATE);
        const daysToClose = Math.floor(
          (forecastDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        // Higher probability and closer dates = higher accuracy
        enriched.forecastAccuracy = Math.min(
          100,
          (opportunity.PROBABILITY || 0) + Math.max(0, 30 - Math.abs(daysToClose))
        );
      }

    } catch (error) {
      console.warn('[OpportunityTool] Error enriching opportunity:', error);
    }

    return enriched;
  }

  /**
   * Analyze pipeline status
   */
  private async analyzePipeline(pipelineId?: number): Promise<PipelineAnalysis[]> {
    const analyses: PipelineAnalysis[] = [];

    try {
      // Get all opportunities
      const searchParams: OpportunitySearchParams = {
        limit: 500 // Get as many as possible
      };
      
      if (pipelineId) {
        searchParams.pipelineId = pipelineId;
      }

      const opportunities = await this.apiTool.searchOpportunities(searchParams);

      // Group by pipeline
      const pipelineGroups = new Map<number, InsightlyOpportunity[]>();
      for (const opp of opportunities.items) {
        if (opp.PIPELINE_ID) {
          const group = pipelineGroups.get(opp.PIPELINE_ID) || [];
          group.push(opp);
          pipelineGroups.set(opp.PIPELINE_ID, group);
        }
      }

      // Analyze each pipeline
      for (const [pipeId, opps] of pipelineGroups) {
        const pipeline = await this.getPipeline(pipeId);
        if (!pipeline) continue;

        // Group by stage
        const stageGroups = new Map<number, InsightlyOpportunity[]>();
        for (const opp of opps) {
          if (opp.STAGE_ID) {
            const group = stageGroups.get(opp.STAGE_ID) || [];
            group.push(opp);
            stageGroups.set(opp.STAGE_ID, group);
          }
        }

        // Analyze stages
        const stageAnalyses: Array<{
          stageId: number;
          stageName: string;
          opportunityCount: number;
          totalValue: number;
          averageValue: number;
          averageDaysInStage: number;
        }> = [];
        for (const [stageId, stageOpps] of stageGroups) {
          const stage = pipeline.PIPELINE_STAGES?.find(s => s.STAGE_ID === stageId);
          if (!stage) continue;

          const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0), 0);
          const averageValue = stageOpps.length > 0 ? totalValue / stageOpps.length : 0;

          // Calculate average days in stage
          let totalDaysInStage = 0;
          let countWithDates = 0;
          for (const opp of stageOpps) {
            if (opp.DATE_UPDATED_UTC) {
              const days = Math.floor(
                (Date.now() - new Date(opp.DATE_UPDATED_UTC).getTime()) / (1000 * 60 * 60 * 24)
              );
              totalDaysInStage += days;
              countWithDates++;
            }
          }
          const averageDaysInStage = countWithDates > 0 ? totalDaysInStage / countWithDates : 0;

          stageAnalyses.push({
            stageId,
            stageName: stage.STAGE_NAME,
            opportunityCount: stageOpps.length,
            totalValue,
            averageValue,
            averageDaysInStage
          });
        }

        // Sort stages by order
        stageAnalyses.sort((a, b) => {
          const stageA = pipeline.PIPELINE_STAGES?.find(s => s.STAGE_ID === a.stageId);
          const stageB = pipeline.PIPELINE_STAGES?.find(s => s.STAGE_ID === b.stageId);
          return (stageA?.STAGE_ORDER || 0) - (stageB?.STAGE_ORDER || 0);
        });

        // Calculate summary
        const totalOpportunities = opps.length;
        const totalValue = opps.reduce((sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0), 0);
        const averageValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
        
        // Calculate conversion rate (won / total)
        const wonOpps = opps.filter(opp => opp.OPPORTUNITY_STATE === 'WON').length;
        const closedOpps = opps.filter(opp => 
          ['WON', 'LOST', 'ABANDONED'].includes(opp.OPPORTUNITY_STATE)
        ).length;
        const conversionRate = closedOpps > 0 ? (wonOpps / closedOpps) * 100 : 0;

        // Calculate average sales cycle
        const wonOppsWithDates = opps.filter(opp => 
          opp.OPPORTUNITY_STATE === 'WON' && 
          opp.DATE_CREATED_UTC && 
          opp.ACTUAL_CLOSE_DATE
        );
        
        let totalSalesCycle = 0;
        for (const opp of wonOppsWithDates) {
          const created = new Date(opp.DATE_CREATED_UTC!);
          const closed = new Date(opp.ACTUAL_CLOSE_DATE!);
          totalSalesCycle += Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }
        const averageSalesCycle = wonOppsWithDates.length > 0 
          ? totalSalesCycle / wonOppsWithDates.length 
          : 0;

        analyses.push({
          pipelineId: pipeId,
          pipelineName: pipeline.PIPELINE_NAME,
          stages: stageAnalyses,
          summary: {
            totalOpportunities,
            totalValue,
            averageValue,
            conversionRate,
            averageSalesCycle
          }
        });
      }

    } catch (error) {
      console.error('[OpportunityTool] Error analyzing pipeline:', error);
    }

    return analyses;
  }

  /**
   * Format opportunity for display
   */
  private formatOpportunityDisplay(opportunity: EnrichedOpportunity): string {
    const parts: string[] = [];

    // Name and value
    parts.push(`**${opportunity.OPPORTUNITY_NAME}**`);
    if (opportunity.OPPORTUNITY_VALUE) {
      parts.push(`💰 $${opportunity.OPPORTUNITY_VALUE.toLocaleString()}`);
    }

    // Pipeline and stage
    if (opportunity.pipelineName && opportunity.stageName) {
      parts.push(`\n📊 ${opportunity.pipelineName} → ${opportunity.stageName}`);
    }

    // Probability and state
    if (opportunity.PROBABILITY !== undefined) {
      parts.push(`🎯 ${opportunity.PROBABILITY}% probability`);
    }
    parts.push(`📌 Status: ${opportunity.OPPORTUNITY_STATE}`);

    // Forecast
    if (opportunity.FORECAST_CLOSE_DATE) {
      const forecastDate = new Date(opportunity.FORECAST_CLOSE_DATE);
      const daysToClose = Math.floor(
        (forecastDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysToClose > 0) {
        parts.push(`\n📅 Forecast close: ${forecastDate.toLocaleDateString()} (${daysToClose} days)`);
      } else if (daysToClose === 0) {
        parts.push(`\n📅 Forecast close: Today!`);
      } else {
        parts.push(`\n⚠️ Overdue by ${Math.abs(daysToClose)} days`);
      }
    }

    // Days in stage
    if (opportunity.daysInCurrentStage !== undefined) {
      parts.push(`⏱️ ${opportunity.daysInCurrentStage} days in current stage`);
    }

    return parts.join(' ');
  }

  /**
   * Format pipeline analysis for display
   */
  private formatPipelineAnalysis(analysis: PipelineAnalysis): string {
    const parts: string[] = [];

    parts.push(`## 📊 ${analysis.pipelineName}`);
    parts.push(`\n**Summary:**`);
    parts.push(`- Total Opportunities: ${analysis.summary.totalOpportunities}`);
    parts.push(`- Total Value: $${analysis.summary.totalValue.toLocaleString()}`);
    parts.push(`- Average Deal Size: $${Math.round(analysis.summary.averageValue).toLocaleString()}`);
    parts.push(`- Win Rate: ${analysis.summary.conversionRate.toFixed(1)}%`);
    parts.push(`- Average Sales Cycle: ${Math.round(analysis.summary.averageSalesCycle)} days`);

    parts.push(`\n**Stage Breakdown:**`);
    for (const stage of analysis.stages) {
      parts.push(`\n**${stage.stageName}**`);
      parts.push(`  - Opportunities: ${stage.opportunityCount}`);
      parts.push(`  - Value: $${stage.totalValue.toLocaleString()}`);
      if (stage.opportunityCount > 0) {
        parts.push(`  - Avg Value: $${Math.round(stage.averageValue).toLocaleString()}`);
        parts.push(`  - Avg Time: ${Math.round(stage.averageDaysInStage)} days`);
      }
    }

    return parts.join('\n');
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
          description: 'The opportunity management action to perform',
          required: true,
          enum: ['search', 'getDetails', 'analyzePipeline', 'forecast', 'getByStage']
        },
        {
          name: 'query',
          type: 'string',
          description: 'Search query, opportunity ID, or pipeline identifier',
          required: false
        },
        {
          name: 'filters',
          type: 'object',
          description: 'Filters for opportunity search',
          required: false,
          properties: {
            state: { name: 'state', type: 'string', description: 'Opportunity state', required: false },
            minValue: { name: 'minValue', type: 'number', description: 'Minimum opportunity value', required: false },
            maxValue: { name: 'maxValue', type: 'number', description: 'Maximum opportunity value', required: false },
            minProbability: { name: 'minProbability', type: 'number', description: 'Minimum probability', required: false },
            stageId: { name: 'stageId', type: 'number', description: 'Pipeline stage ID', required: false }
          }
        }
      ],
      returns: {
        type: 'object',
        description: 'Opportunity information with analysis'
      },
      examples: [
        {
          input: {
            action: 'analyzePipeline'
          },
          output: {
            success: true,
            data: {
              pipelines: [
                {
                  name: 'Sales Pipeline',
                  totalOpportunities: 45,
                  totalValue: 1250000,
                  conversionRate: 32.5
                }
              ]
            }
          },
          description: 'Analyze all pipelines'
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
      const validActions = ['search', 'getDetails', 'analyzePipeline', 'forecast', 'getByStage'];
      if (!validActions.includes(params.action)) {
        errors.push(`Invalid action: ${params.action}`);
      }
    }

    // Some actions require query
    if (['search', 'getDetails'].includes(params.action) && !params.query) {
      errors.push(`Query is required for action: ${params.action}`);
    }

    if (params.filters && typeof params.filters !== 'object') {
      errors.push('Filters must be an object');
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
      const { action, query, filters = {} } = params;
      console.log(`[OpportunityTool] Executing ${action}`);

      let result: any;
      
      switch (action) {
        case 'search': {
          const searchParams: OpportunitySearchParams = {
            limit: 20
          };

          // Parse query
          if (query) {
            searchParams.name = query;
          }

          // Apply filters
          if (filters.state) searchParams.state = filters.state;
          if (filters.minValue || filters.maxValue) {
            searchParams.valueRange = {
              min: filters.minValue || 0,
              max: filters.maxValue || Number.MAX_SAFE_INTEGER
            };
          }
          if (filters.minProbability) {
            searchParams.probabilityRange = {
              min: filters.minProbability,
              max: 100
            };
          }
          if (filters.stageId) searchParams.stageId = filters.stageId;

          const opportunities = await this.apiTool.searchOpportunities(searchParams);
          const enriched = await Promise.all(
            opportunities.items.map(opp => this.enrichOpportunity(opp))
          );

          result = {
            opportunities: enriched.map(opp => ({
              id: opp.OPPORTUNITY_ID,
              name: opp.OPPORTUNITY_NAME,
              value: opp.OPPORTUNITY_VALUE,
              probability: opp.PROBABILITY,
              state: opp.OPPORTUNITY_STATE,
              pipeline: opp.pipelineName,
              stage: opp.stageName,
              forecastDate: opp.FORECAST_CLOSE_DATE,
              daysInStage: opp.daysInCurrentStage,
              display: this.formatOpportunityDisplay(opp)
            })),
            count: enriched.length,
            totalValue: enriched.reduce((sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0), 0)
          };
          break;
        }

        case 'getDetails': {
          const oppId = parseInt(query || '');
          if (isNaN(oppId)) {
            throw new Error('Opportunity ID must be numeric');
          }

          const response = await this.apiTool.execute({
            operation: 'getOpportunity',
            params: { id: oppId }
          });

          if (response.success && response.data) {
            const enriched = await this.enrichOpportunity(response.data);
            result = {
              opportunity: enriched,
              display: this.formatOpportunityDisplay(enriched)
            };
          } else {
            throw new Error('Opportunity not found');
          }
          break;
        }

        case 'analyzePipeline': {
          const pipelineId = query ? parseInt(query) : undefined;
          const analyses = await this.analyzePipeline(pipelineId);

          result = {
            pipelines: analyses.map(analysis => ({
              id: analysis.pipelineId,
              name: analysis.pipelineName,
              display: this.formatPipelineAnalysis(analysis),
              summary: analysis.summary,
              stages: analysis.stages
            })),
            count: analyses.length
          };
          break;
        }

        case 'forecast': {
          // Get open opportunities with forecast dates
          const opportunities = await this.apiTool.searchOpportunities({
            state: 'OPEN',
            limit: 100
          });

          const withForecast = opportunities.items.filter(opp => opp.FORECAST_CLOSE_DATE);
          
          // Group by month
          const monthlyForecast = new Map<string, { count: number; value: number; weighted: number }>();
          
          for (const opp of withForecast) {
            const date = new Date(opp.FORECAST_CLOSE_DATE!);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const existing = monthlyForecast.get(monthKey) || { count: 0, value: 0, weighted: 0 };
            existing.count++;
            existing.value += opp.OPPORTUNITY_VALUE || 0;
            existing.weighted += (opp.OPPORTUNITY_VALUE || 0) * ((opp.PROBABILITY || 0) / 100);
            monthlyForecast.set(monthKey, existing);
          }

          // Convert to sorted array
          const forecast = Array.from(monthlyForecast.entries())
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => a.month.localeCompare(b.month));

          result = {
            forecast,
            summary: {
              totalOpportunities: withForecast.length,
              totalValue: withForecast.reduce((sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0), 0),
              weightedValue: withForecast.reduce(
                (sum, opp) => sum + ((opp.OPPORTUNITY_VALUE || 0) * ((opp.PROBABILITY || 0) / 100)),
                0
              )
            }
          };
          break;
        }

        case 'getByStage': {
          const stageId = query ? parseInt(query) : undefined;
          if (!stageId) {
            throw new Error('Stage ID is required for getByStage');
          }

          const opportunities = await this.apiTool.searchOpportunities({
            stageId,
            limit: 50
          });

          const enriched = await Promise.all(
            opportunities.items.map(opp => this.enrichOpportunity(opp))
          );

          result = {
            stageName: enriched[0]?.stageName || `Stage ${stageId}`,
            opportunities: enriched.map(opp => ({
              id: opp.OPPORTUNITY_ID,
              name: opp.OPPORTUNITY_NAME,
              value: opp.OPPORTUNITY_VALUE,
              probability: opp.PROBABILITY,
              daysInStage: opp.daysInCurrentStage
            })),
            count: enriched.length,
            totalValue: enriched.reduce((sum, opp) => sum + (opp.OPPORTUNITY_VALUE || 0), 0),
            averageDaysInStage: enriched.reduce((sum, opp) => sum + (opp.daysInCurrentStage || 0), 0) / enriched.length
          };
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return this.createSuccessResult(
        result,
        `Successfully executed ${action}`,
        {
          action,
          timestamp: new Date().toISOString(),
          sessionId: context?.sessionId
        }
      );

    } catch (error) {
      console.error('[OpportunityTool] Execution error:', error);
      
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        {
          action: params.action,
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
    this.pipelineCache.clear();
    await this.apiTool.cleanup();
    console.log('[OpportunityTool] Cleanup complete');
  }
}