/**
 * Example Data Analysis Tool
 * Demonstrates how to use streaming callbacks in tool execution
 */

import { BaseTool } from '../Tool';
import {
  ToolResult,
  ToolParams,
  ToolSchema,
  ToolContext,
  ToolConfig
} from '../Tool';

export class DataAnalysisTool extends BaseTool {
  constructor() {
    const toolConfig: ToolConfig = {
      enabled: true,
      timeout: 30000,
      retries: 1
    };

    super(
      'data-analysis',
      '1.0.0',
      'Analyzes data and provides insights with progress updates',
      toolConfig,
      {
        author: 'ChatSG Analytics',
        category: 'analytics',
        tags: ['data', 'analysis', 'statistics']
      }
    );
  }

  getSchema(): ToolSchema {
    return {
      name: this.name,
      description: this.description,
      parameters: [
        {
          name: 'data',
          type: 'array',
          description: 'Array of data points to analyze',
          required: true
        },
        {
          name: 'analysisType',
          type: 'string',
          description: 'Type of analysis to perform',
          required: true,
          enum: ['summary', 'trends', 'outliers', 'full']
        }
      ],
      returns: {
        type: 'object',
        description: 'Analysis results including statistics and insights'
      }
    };
  }

  async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
    try {
      const { data, analysisType } = params;
      
      // Send tool start event with parameters
      this.sendToolStart({ dataPoints: data.length, analysisType }, context);
      
      // Step 1: Data validation
      this.sendToolProgress('Validating data...', { step: 1, total: 4 }, context);
      await this.simulateWork(500);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data: must be a non-empty array');
      }
      
      // Step 2: Calculate basic statistics
      this.sendToolProgress('Calculating statistics...', { step: 2, total: 4 }, context);
      await this.simulateWork(1000);
      
      const stats = this.calculateStatistics(data);
      
      // Step 3: Perform specific analysis
      this.sendToolProgress(`Performing ${analysisType} analysis...`, { step: 3, total: 4 }, context);
      await this.simulateWork(1500);
      
      let insights: any = {};
      switch (analysisType) {
        case 'summary':
          insights = this.generateSummary(stats);
          break;
        case 'trends':
          insights = this.analyzeTrends(data);
          break;
        case 'outliers':
          insights = this.detectOutliers(data, stats);
          break;
        case 'full':
          insights = {
            summary: this.generateSummary(stats),
            trends: this.analyzeTrends(data),
            outliers: this.detectOutliers(data, stats)
          };
          break;
      }
      
      // Step 4: Generate report
      this.sendToolProgress('Generating report...', { step: 4, total: 4 }, context);
      await this.simulateWork(500);
      
      const result = {
        statistics: stats,
        insights,
        dataQuality: {
          totalPoints: data.length,
          validPoints: data.filter(d => typeof d === 'number' && !isNaN(d)).length,
          nullPoints: data.filter(d => d === null || d === undefined).length
        }
      };
      
      // Send successful result
      this.sendToolResult(result, context);
      
      return this.createSuccessResult(result, 'Analysis completed successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendToolError(errorMessage, context);
      return this.createErrorResult(errorMessage);
    }
  }

  private async simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateStatistics(data: number[]): any {
    const numbers = data.filter(d => typeof d === 'number' && !isNaN(d));
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    const sorted = [...numbers].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    return {
      count: numbers.length,
      sum,
      mean,
      median,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      range: Math.max(...numbers) - Math.min(...numbers)
    };
  }

  private generateSummary(stats: any): any {
    return {
      description: `Dataset contains ${stats.count} valid numeric values`,
      centralTendency: `Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median}`,
      spread: `Range: ${stats.range} (${stats.min} to ${stats.max})`
    };
  }

  private analyzeTrends(data: number[]): any {
    // Simple trend analysis
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return {
      trend: secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable',
      changePercent: ((secondAvg - firstAvg) / firstAvg * 100).toFixed(2)
    };
  }

  private detectOutliers(data: number[], stats: any): any {
    const threshold = stats.range * 0.25;
    const outliers = data.filter(d => 
      typeof d === 'number' && 
      (d < stats.mean - threshold || d > stats.mean + threshold)
    );
    
    return {
      count: outliers.length,
      values: outliers,
      percentage: (outliers.length / data.length * 100).toFixed(2)
    };
  }
}