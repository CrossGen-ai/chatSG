/**
 * Analytical Agent Implementation
 * 
 * Specialized agent for data analysis, research, and logical reasoning tasks.
 * Extends SpecializedLLMAgent to provide analytical capabilities through
 * the orchestrator system.
 */

import { SpecializedLLMAgent } from './SpecializedLLMAgent';
import { AgentCapabilities } from '../../types';

/**
 * Agent specialized for analytical tasks including data analysis,
 * research, pattern recognition, and logical reasoning
 */
export class AnalyticalAgent extends SpecializedLLMAgent {
    
    constructor() {
        super(
            'AnalyticalAgent', 
            'analytical',
            'Specialized agent for data analysis, research, and logical reasoning tasks'
        );
    }

    /**
     * Get specialized prompt for analytical tasks
     * Uses the 'analyst' prompt from llm-helper.js system
     */
    protected getSpecializedPrompt(context: any): string {
        // Use the analyst prompt with enhanced context for analytical work
        const enhancedContext = {
            ...context,
            agentType: 'analytical',
            specialization: 'data analysis and research',
            capabilities: 'pattern analysis, logical reasoning, research methodology',
            instructions: 'Focus on thorough analysis, cite sources when possible, and provide structured insights'
        };

        return this.llmHelper.getSystemPrompt('analyst', enhancedContext);
    }

    /**
     * Get enhanced capabilities specific to analytical work
     */
    getCapabilities(): AgentCapabilities {
        const baseCapabilities = super.getCapabilities();
        
        return {
            ...baseCapabilities,
            name: 'AnalyticalAgent',
            supportedModes: [
                'analysis', 
                'research', 
                'data', 
                'logical_reasoning',
                'pattern_recognition',
                'statistical_analysis'
            ],
            features: [
                ...baseCapabilities.features,
                'data_analysis',
                'logical_reasoning',
                'pattern_analysis',
                'research_methodology',
                'statistical_interpretation',
                'hypothesis_testing',
                'trend_identification',
                'comparative_analysis'
            ],
            inputTypes: ['text', 'data', 'structured_data'],
            outputTypes: ['text', 'analysis_report', 'insights'],
            supportsTools: true, // Analytical agents can benefit from data tools
            supportsStateSharing: true
        };
    }

    /**
     * Enhanced processMessage for analytical tasks
     * Adds analytical context and structured thinking
     */
    async processMessage(input: string, sessionId: string) {
        console.log(`[${this.name}] Processing analytical request: "${input.substring(0, 50)}..."`);
        
        // Check if this is an analytical task
        const isAnalyticalTask = this.isAnalyticalTask(input);
        
        if (isAnalyticalTask) {
            console.log(`[${this.name}] Detected analytical task type: ${isAnalyticalTask}`);
        }
        
        // Call parent implementation with enhanced logging
        const result = await super.processMessage(input, sessionId);
        
        // Add analytical metadata to response
        if (result.metadata) {
            result.metadata.analyticalTaskType = isAnalyticalTask;
            result.metadata.analysisApproach = this.getAnalysisApproach(input);
        }
        
        return result;
    }

    /**
     * Determine if the input is an analytical task and what type
     */
    private isAnalyticalTask(input: string): string | null {
        const lowerInput = input.toLowerCase();
        
        // Data analysis keywords
        if (lowerInput.includes('analyze') || lowerInput.includes('analysis')) {
            return 'data_analysis';
        }
        
        // Research keywords
        if (lowerInput.includes('research') || lowerInput.includes('investigate')) {
            return 'research';
        }
        
        // Pattern recognition keywords
        if (lowerInput.includes('pattern') || lowerInput.includes('trend')) {
            return 'pattern_recognition';
        }
        
        // Statistical analysis keywords
        if (lowerInput.includes('statistic') || lowerInput.includes('correlation')) {
            return 'statistical_analysis';
        }
        
        // Comparison keywords
        if (lowerInput.includes('compare') || lowerInput.includes('contrast')) {
            return 'comparative_analysis';
        }
        
        // Logical reasoning keywords
        if (lowerInput.includes('logic') || lowerInput.includes('reason') || lowerInput.includes('conclude')) {
            return 'logical_reasoning';
        }
        
        return null;
    }

    /**
     * Determine the analytical approach based on input
     */
    private getAnalysisApproach(input: string): string {
        const lowerInput = input.toLowerCase();
        
        if (lowerInput.includes('quantitative') || lowerInput.includes('number') || lowerInput.includes('data')) {
            return 'quantitative';
        }
        
        if (lowerInput.includes('qualitative') || lowerInput.includes('interview') || lowerInput.includes('survey')) {
            return 'qualitative';
        }
        
        if (lowerInput.includes('mixed') || (lowerInput.includes('both') && lowerInput.includes('method'))) {
            return 'mixed_methods';
        }
        
        return 'exploratory';
    }

    /**
     * Get analytical agent information
     */
    getInfo() {
        const baseInfo = super.getInfo();
        return {
            ...baseInfo,
            specialization: 'analytical',
            analyticalCapabilities: [
                'Data Analysis',
                'Research Methodology',
                'Pattern Recognition',
                'Statistical Interpretation',
                'Logical Reasoning',
                'Comparative Analysis'
            ],
            optimalFor: [
                'Business Intelligence',
                'Academic Research',
                'Market Analysis',
                'Performance Evaluation',
                'Trend Analysis',
                'Problem Diagnosis'
            ]
        };
    }
} 