/**
 * Data Analyzer Tool
 * 
 * A comprehensive data analysis tool that provides statistical analysis,
 * data transformation, and visualization preparation capabilities.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../Tool';

export class DataAnalyzerTool extends BaseTool {
    constructor() {
        super(
            'data-analyzer',
            '1.0.0',
            'Advanced data analysis tool with statistical analysis, transformation, and visualization capabilities',
            { 
                enabled: true, 
                timeout: 15000,
                cacheResults: true,
                cacheTTL: 600000 // 10 minutes
            },
            {
                author: 'ChatSG Tool System',
                category: 'data',
                tags: ['data', 'analysis', 'statistics', 'transformation']
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
                    description: 'Array of data points to analyze (numbers or objects)',
                    required: true
                },
                {
                    name: 'operation',
                    type: 'string',
                    description: 'The analysis operation to perform',
                    required: true,
                    enum: [
                        'descriptive-stats',
                        'outliers',
                        'normalize',
                        'group-by',
                        'aggregate'
                    ]
                },
                {
                    name: 'options',
                    type: 'object',
                    description: 'Additional options for the analysis',
                    required: false,
                    properties: {
                        field: {
                            name: 'field',
                            type: 'string',
                            description: 'Field name to analyze (for object arrays)',
                            required: false
                        },
                        groupBy: {
                            name: 'groupBy',
                            type: 'string',
                            description: 'Field to group by',
                            required: false
                        },
                        method: {
                            name: 'method',
                            type: 'string',
                            description: 'Analysis method (e.g., mean, median, sum)',
                            required: false
                        }
                    }
                }
            ],
            returns: {
                type: 'object',
                description: 'Analysis results',
                properties: {
                    result: 'any',
                    operation: 'string',
                    dataSize: 'number',
                    metadata: 'object'
                }
            },
            examples: [
                {
                    input: {
                        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                        operation: 'descriptive-stats'
                    },
                    output: {
                        result: {
                            count: 10,
                            mean: 5.5,
                            median: 5.5,
                            min: 1,
                            max: 10
                        },
                        operation: 'descriptive-stats',
                        dataSize: 10
                    },
                    description: 'Calculate descriptive statistics for numeric array'
                }
            ]
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const { data, operation, options = {} } = params;

            if (!Array.isArray(data)) {
                return this.createErrorResult('Data must be an array');
            }

            let result: any;
            const metadata: any = {};

            switch (operation) {
                case 'descriptive-stats':
                    result = this.calculateDescriptiveStats(data, options.field);
                    break;

                case 'outliers':
                    result = this.detectOutliers(data, options.field, options.method);
                    break;

                case 'normalize':
                    result = this.normalizeData(data, options.field, options.method);
                    break;

                case 'group-by':
                    result = this.groupByField(data, options.groupBy);
                    break;

                case 'aggregate':
                    result = this.aggregateData(data, options.groupBy, options.field, options.method);
                    break;

                default:
                    return this.createErrorResult(`Unknown operation: ${operation}`);
            }

            const executionTime = Date.now() - startTime;

            return this.createSuccessResult({
                result,
                operation,
                dataSize: data.length,
                metadata
            }, `Data analysis completed: ${operation}`, {
                executionTime
            });

        } catch (error) {
            return this.createErrorResult(`Data analysis failed: ${(error as Error).message}`);
        }
    }

    private extractNumericValues(data: any[], field?: string): number[] {
        if (!field) {
            return data.filter(item => typeof item === 'number' && !isNaN(item));
        }

        return data
            .map(item => typeof item === 'object' && item !== null ? item[field] : item)
            .filter(value => typeof value === 'number' && !isNaN(value));
    }

    private calculateDescriptiveStats(data: any[], field?: string): any {
        const values = this.extractNumericValues(data, field);
        
        if (values.length === 0) {
            return { error: 'No numeric values found' };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / count;

        // Median
        const median = count % 2 === 0
            ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
            : sorted[Math.floor(count / 2)];

        // Standard deviation
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        return {
            count,
            sum: Math.round(sum * 100) / 100,
            mean: Math.round(mean * 100) / 100,
            median: Math.round(median * 100) / 100,
            stdDev: Math.round(stdDev * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            min: Math.min(...values),
            max: Math.max(...values),
            range: Math.max(...values) - Math.min(...values)
        };
    }

    private detectOutliers(data: any[], field?: string, method: string = 'iqr'): any {
        const values = this.extractNumericValues(data, field);
        
        if (values.length === 0) {
            return { error: 'No numeric values found' };
        }

        const sorted = [...values].sort((a, b) => a - b);
        let outliers: number[] = [];

        if (method === 'iqr') {
            const q1Index = Math.floor(sorted.length * 0.25);
            const q3Index = Math.floor(sorted.length * 0.75);
            const q1 = sorted[q1Index];
            const q3 = sorted[q3Index];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;

            outliers = values.filter(val => val < lowerBound || val > upperBound);
        }

        return {
            outliers,
            count: outliers.length,
            percentage: Math.round((outliers.length / values.length) * 10000) / 100,
            method
        };
    }

    private normalizeData(data: any[], field?: string, method: string = 'minmax'): any {
        const values = this.extractNumericValues(data, field);
        
        if (values.length === 0) {
            return { error: 'No numeric values found' };
        }

        let normalized: number[] = [];

        if (method === 'minmax') {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;
            
            if (range === 0) {
                normalized = values.map(() => 0);
            } else {
                normalized = values.map(val => (val - min) / range);
            }
        }

        return {
            normalized: normalized.map(val => Math.round(val * 10000) / 10000),
            method,
            originalRange: { min: Math.min(...values), max: Math.max(...values) }
        };
    }

    private groupByField(data: any[], groupBy?: string): any {
        if (!groupBy) {
            return { error: 'groupBy field is required' };
        }

        const groups: Record<string, any[]> = {};

        data.forEach(item => {
            const key = typeof item === 'object' && item !== null ? item[groupBy] : String(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });

        return {
            groups,
            groupCount: Object.keys(groups).length,
            groupSizes: Object.entries(groups).map(([key, items]) => ({
                group: key,
                size: items.length
            }))
        };
    }

    private aggregateData(data: any[], groupBy?: string, field?: string, method: string = 'sum'): any {
        if (!groupBy) {
            return { error: 'groupBy field is required' };
        }

        const grouped = this.groupByField(data, groupBy);
        if (grouped.error) {
            return grouped;
        }

        const aggregated: Record<string, number> = {};

        for (const [groupKey, items] of Object.entries(grouped.groups)) {
            const values = this.extractNumericValues(items as any[], field);
            
            if (values.length === 0) {
                aggregated[groupKey] = 0;
                continue;
            }

            switch (method) {
                case 'sum':
                    aggregated[groupKey] = values.reduce((a, b) => a + b, 0);
                    break;
                case 'mean':
                    aggregated[groupKey] = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'count':
                    aggregated[groupKey] = values.length;
                    break;
                case 'min':
                    aggregated[groupKey] = Math.min(...values);
                    break;
                case 'max':
                    aggregated[groupKey] = Math.max(...values);
                    break;
                default:
                    aggregated[groupKey] = values.reduce((a, b) => a + b, 0);
            }

            aggregated[groupKey] = Math.round(aggregated[groupKey] * 100) / 100;
        }

        return {
            aggregated,
            method,
            groupBy,
            field
        };
    }
}
