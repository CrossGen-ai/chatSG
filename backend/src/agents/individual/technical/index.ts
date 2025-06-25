/**
 * Technical Agent Module
 * Exports the technical agent implementation
 */

// Main agent export
export { TechnicalAgent } from './agent';

// Note: Config can be imported separately if needed
// import TechnicalConfig from './config.json';

// Basic placeholder types until proper tools and memory are implemented
export interface CodeAnalysisResults {
    issues: string[];
    suggestions: string[];
    performance: number;
    security: string[];
}

export interface DebugOptions {
    verbose?: boolean;
    includeStackTrace?: boolean;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export interface OptimizationConfig {
    target: 'performance' | 'memory' | 'size';
    level: 'basic' | 'advanced' | 'aggressive';
    preserveComments?: boolean;
}

export interface PerformanceResult {
    executionTime: number;
    memoryUsage: number;
    optimizations: string[];
    bottlenecks: string[];
}

export interface TechnicalMemoryEntry {
    id: string;
    code: string;
    language: string;
    analysis: CodeAnalysisResults;
    timestamp: Date;
}

export interface TechnicalSearchOptions {
    query: string;
    languages?: string[];
    categories?: string[];
    dateRange?: { start: Date; end: Date };
}

// Alternative export
export { TechnicalAgent as default } from './agent'; 