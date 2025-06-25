/**
 * Analytical Agent Tools
 * 
 * Domain-specific tools for statistical analysis and data visualization.
 * These tools complement the shared tools with specialized analytical capabilities.
 */

/**
 * Statistical analysis results interface
 */
export interface StatisticalResults {
    mean?: number;
    median?: number;
    mode?: number[];
    stdDev?: number;
    variance?: number;
    count: number;
    min?: number;
    max?: number;
    range?: number;
    correlations?: { [key: string]: number };
    distribution?: string;
    percentiles?: { [key: string]: number };
}

/**
 * Analysis options interface
 */
export interface AnalysisOptions {
    includeBasicStats?: boolean;
    includeCorrelations?: boolean;
    includeDistribution?: boolean;
    includePercentiles?: boolean;
    precision?: number;
}

/**
 * Visualization configuration interface
 */
export interface VisualizationConfig {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
    title: string;
    width?: number;
    height?: number;
    theme?: 'light' | 'dark';
    colors?: string[];
}

/**
 * Visualization result interface
 */
export interface VisualizationResult {
    url: string;
    description: string;
    config: VisualizationConfig;
    metadata: {
        dataPoints: number;
        chartType: string;
        generatedAt: Date;
    };
}

/**
 * Statistics Calculator Tool
 * Provides comprehensive statistical analysis capabilities
 */
export class StatisticsCalculator {
    private precision: number = 6;

    constructor(precision: number = 6) {
        this.precision = precision;
    }

    /**
     * Perform comprehensive statistical analysis
     */
    async analyze(data: number[], options: AnalysisOptions = {}): Promise<StatisticalResults> {
        if (!data || data.length === 0) {
            throw new Error('Data array is empty or invalid');
        }

        const results: StatisticalResults = {
            count: data.length
        };

        if (options.includeBasicStats !== false) {
            results.mean = this.calculateMean(data);
            results.median = this.calculateMedian(data);
            results.mode = this.calculateMode(data);
            results.stdDev = this.calculateStandardDeviation(data, results.mean);
            results.variance = Math.pow(results.stdDev, 2);
            results.min = Math.min(...data);
            results.max = Math.max(...data);
            results.range = results.max - results.min;
        }

        if (options.includePercentiles) {
            results.percentiles = this.calculatePercentiles(data);
        }

        if (options.includeDistribution) {
            results.distribution = this.analyzeDistribution(data);
        }

        // Round results based on precision
        return this.roundResults(results);
    }

    /**
     * Calculate mean (average)
     */
    private calculateMean(data: number[]): number {
        return data.reduce((sum, value) => sum + value, 0) / data.length;
    }

    /**
     * Calculate median
     */
    private calculateMedian(data: number[]): number {
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return sorted[mid];
    }

    /**
     * Calculate mode(s)
     */
    private calculateMode(data: number[]): number[] {
        const frequency: { [key: number]: number } = {};
        let maxFreq = 0;

        // Calculate frequencies
        data.forEach(value => {
            frequency[value] = (frequency[value] || 0) + 1;
            maxFreq = Math.max(maxFreq, frequency[value]);
        });

        // Find all values with maximum frequency
        return Object.keys(frequency)
            .filter(key => frequency[parseFloat(key)] === maxFreq)
            .map(key => parseFloat(key));
    }

    /**
     * Calculate standard deviation
     */
    private calculateStandardDeviation(data: number[], mean: number): number {
        const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
        return Math.sqrt(variance);
    }

    /**
     * Calculate percentiles
     */
    private calculatePercentiles(data: number[]): { [key: string]: number } {
        const sorted = [...data].sort((a, b) => a - b);
        const percentiles: { [key: string]: number } = {};

        [10, 25, 50, 75, 90, 95, 99].forEach(p => {
            const index = (p / 100) * (sorted.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            
            if (lower === upper) {
                percentiles[`p${p}`] = sorted[lower];
            } else {
                const weight = index - lower;
                percentiles[`p${p}`] = sorted[lower] * (1 - weight) + sorted[upper] * weight;
            }
        });

        return percentiles;
    }

    /**
     * Analyze data distribution
     */
    private analyzeDistribution(data: number[]): string {
        const mean = this.calculateMean(data);
        const median = this.calculateMedian(data);
        const stdDev = this.calculateStandardDeviation(data, mean);

        // Simple distribution analysis
        if (Math.abs(mean - median) < stdDev * 0.1) {
            return 'Normal (approximately symmetric)';
        } else if (mean > median) {
            return 'Right-skewed (positive skew)';
        } else {
            return 'Left-skewed (negative skew)';
        }
    }

    /**
     * Round numerical results based on precision
     */
    private roundResults(results: StatisticalResults): StatisticalResults {
        const roundedResults = { ...results };

        // Round numerical properties
        ['mean', 'median', 'stdDev', 'variance', 'min', 'max', 'range'].forEach(prop => {
            if (typeof roundedResults[prop as keyof StatisticalResults] === 'number') {
                (roundedResults as any)[prop] = parseFloat(
                    ((roundedResults as any)[prop] as number).toFixed(this.precision)
                );
            }
        });

        // Round percentiles
        if (roundedResults.percentiles) {
            Object.keys(roundedResults.percentiles).forEach(key => {
                roundedResults.percentiles![key] = parseFloat(
                    roundedResults.percentiles![key].toFixed(this.precision)
                );
            });
        }

        return roundedResults;
    }

    /**
     * Calculate correlation between two datasets
     */
    async calculateCorrelation(dataX: number[], dataY: number[]): Promise<number> {
        if (dataX.length !== dataY.length) {
            throw new Error('Datasets must have the same length');
        }

        const meanX = this.calculateMean(dataX);
        const meanY = this.calculateMean(dataY);
        
        let numerator = 0;
        let denominatorX = 0;
        let denominatorY = 0;

        for (let i = 0; i < dataX.length; i++) {
            const diffX = dataX[i] - meanX;
            const diffY = dataY[i] - meanY;
            
            numerator += diffX * diffY;
            denominatorX += diffX * diffX;
            denominatorY += diffY * diffY;
        }

        const denominator = Math.sqrt(denominatorX * denominatorY);
        return denominator === 0 ? 0 : numerator / denominator;
    }
}

/**
 * Data Visualization Tool
 * Creates charts and graphs from numerical data
 */
export class DataVisualizationTool {
    private baseUrl: string = '/api/visualizations';

    constructor(baseUrl?: string) {
        if (baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    /**
     * Create a visualization from data
     */
    async createVisualization(
        data: number[], 
        config: VisualizationConfig
    ): Promise<VisualizationResult> {
        try {
            // Validate input
            if (!data || data.length === 0) {
                throw new Error('Data array is empty');
            }

            // Prepare visualization data based on chart type
            const chartData = this.prepareChartData(data, config);
            
            // Generate unique chart ID
            const chartId = this.generateChartId();
            
            // Create chart URL (in a real implementation, this would generate an actual chart)
            const chartUrl = `${this.baseUrl}/${chartId}`;

            // Generate description
            const description = this.generateDescription(data, config);

            return {
                url: chartUrl,
                description,
                config,
                metadata: {
                    dataPoints: data.length,
                    chartType: config.type,
                    generatedAt: new Date()
                }
            };
        } catch (error) {
            throw new Error(`Visualization creation failed: ${(error as Error).message}`);
        }
    }

    /**
     * Prepare chart data based on type
     */
    private prepareChartData(data: number[], config: VisualizationConfig): any {
        switch (config.type) {
            case 'histogram':
                return this.createHistogramData(data);
            case 'bar':
                return this.createBarData(data);
            case 'line':
                return this.createLineData(data);
            case 'pie':
                return this.createPieData(data);
            case 'scatter':
            default:
                return this.createScatterData(data);
        }
    }

    /**
     * Create histogram data
     */
    private createHistogramData(data: number[]): any {
        const bins = Math.ceil(Math.sqrt(data.length)); // Square root rule
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binWidth = (max - min) / bins;
        
        const histogram = new Array(bins).fill(0);
        
        data.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
            histogram[binIndex]++;
        });

        return {
            bins: histogram,
            binWidth,
            min,
            max
        };
    }

    /**
     * Create bar chart data
     */
    private createBarData(data: number[]): any {
        return {
            values: data,
            labels: data.map((_, index) => `Item ${index + 1}`)
        };
    }

    /**
     * Create line chart data
     */
    private createLineData(data: number[]): any {
        return {
            points: data.map((value, index) => ({ x: index, y: value }))
        };
    }

    /**
     * Create pie chart data
     */
    private createPieData(data: number[]): any {
        const total = data.reduce((sum, value) => sum + Math.abs(value), 0);
        return {
            segments: data.map((value, index) => ({
                label: `Segment ${index + 1}`,
                value: Math.abs(value),
                percentage: (Math.abs(value) / total) * 100
            }))
        };
    }

    /**
     * Create scatter plot data
     */
    private createScatterData(data: number[]): any {
        return {
            points: data.map((value, index) => ({
                x: index,
                y: value
            }))
        };
    }

    /**
     * Generate chart description
     */
    private generateDescription(data: number[], config: VisualizationConfig): string {
        const stats = {
            count: data.length,
            min: Math.min(...data),
            max: Math.max(...data),
            mean: data.reduce((sum, val) => sum + val, 0) / data.length
        };

        return `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} chart with ${stats.count} data points. Range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}, Mean: ${stats.mean.toFixed(2)}`;
    }

    /**
     * Generate unique chart ID
     */
    private generateChartId(): string {
        return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get supported chart types
     */
    getSupportedTypes(): string[] {
        return ['bar', 'line', 'pie', 'scatter', 'histogram'];
    }

    /**
     * Validate visualization configuration
     */
    validateConfig(config: VisualizationConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config.type || !this.getSupportedTypes().includes(config.type)) {
            errors.push(`Invalid chart type: ${config.type}`);
        }

        if (!config.title || config.title.trim() === '') {
            errors.push('Chart title is required');
        }

        if (config.width && (config.width < 100 || config.width > 2000)) {
            errors.push('Chart width must be between 100 and 2000 pixels');
        }

        if (config.height && (config.height < 100 || config.height > 2000)) {
            errors.push('Chart height must be between 100 and 2000 pixels');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
} 