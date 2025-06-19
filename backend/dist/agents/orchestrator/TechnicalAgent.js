"use strict";
/**
 * Technical Agent Implementation
 *
 * Specialized agent for coding, debugging, and technical problem-solving tasks.
 * Extends SpecializedLLMAgent to provide technical capabilities through
 * the orchestrator system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnicalAgent = void 0;
const SpecializedLLMAgent_1 = require("./SpecializedLLMAgent");
/**
 * Agent specialized for technical tasks including coding, debugging,
 * technical analysis, and software development support
 */
class TechnicalAgent extends SpecializedLLMAgent_1.SpecializedLLMAgent {
    constructor() {
        super('TechnicalAgent', 'technical', 'Specialized agent for coding, debugging, and technical problem-solving tasks');
    }
    /**
     * Get specialized prompt for technical tasks
     * Uses the 'codeAssistant' prompt from llm-helper.js system
     */
    getSpecializedPrompt(context) {
        // Use the codeAssistant prompt with enhanced context for technical work
        const enhancedContext = {
            ...context,
            agentType: 'technical',
            specialization: 'coding and technical support',
            capabilities: 'code generation, debugging, technical analysis, architecture design',
            instructions: 'Provide clear, well-commented code examples and explain reasoning behind technical decisions'
        };
        return this.llmHelper.getSystemPrompt('codeAssistant', enhancedContext);
    }
    /**
     * Get enhanced capabilities specific to technical work
     */
    getCapabilities() {
        const baseCapabilities = super.getCapabilities();
        return {
            ...baseCapabilities,
            name: 'TechnicalAgent',
            supportedModes: [
                'coding',
                'debugging',
                'technical',
                'code_review',
                'architecture',
                'optimization',
                'testing'
            ],
            features: [
                ...baseCapabilities.features,
                'code_generation',
                'debugging',
                'technical_analysis',
                'code_review',
                'architecture_design',
                'performance_optimization',
                'testing_strategies',
                'documentation_generation',
                'refactoring',
                'security_analysis'
            ],
            inputTypes: ['text', 'code', 'error_message', 'technical_specification'],
            outputTypes: ['text', 'code', 'technical_documentation', 'debugging_solution'],
            supportsTools: true, // Technical agents can benefit from development tools
            supportsStateSharing: true
        };
    }
    /**
     * Enhanced processMessage for technical tasks
     * Adds technical context and code analysis
     */
    async processMessage(input, sessionId) {
        console.log(`[${this.name}] Processing technical request: "${input.substring(0, 50)}..."`);
        // Check if this is a technical task and what type
        const technicalTaskType = this.identifyTechnicalTask(input);
        if (technicalTaskType) {
            console.log(`[${this.name}] Detected technical task type: ${technicalTaskType}`);
        }
        // Detect programming language if present
        const programmingLanguage = this.detectProgrammingLanguage(input);
        if (programmingLanguage) {
            console.log(`[${this.name}] Detected programming language: ${programmingLanguage}`);
        }
        // Call parent implementation with enhanced logging
        const result = await super.processMessage(input, sessionId);
        // Add technical metadata to response
        if (result.metadata) {
            result.metadata.technicalTaskType = technicalTaskType;
            result.metadata.programmingLanguage = programmingLanguage;
            result.metadata.complexityLevel = this.assessComplexity(input);
            result.metadata.technicalDomain = this.identifyTechnicalDomain(input);
        }
        return result;
    }
    /**
     * Identify the type of technical task being requested
     */
    identifyTechnicalTask(input) {
        const lowerInput = input.toLowerCase();
        // Code generation keywords
        if (lowerInput.includes('write code') || lowerInput.includes('implement') || lowerInput.includes('create function')) {
            return 'code_generation';
        }
        // Debugging keywords
        if (lowerInput.includes('debug') || lowerInput.includes('error') || lowerInput.includes('fix') || lowerInput.includes('bug')) {
            return 'debugging';
        }
        // Code review keywords
        if (lowerInput.includes('review') || lowerInput.includes('optimize') || lowerInput.includes('improve code')) {
            return 'code_review';
        }
        // Architecture keywords
        if (lowerInput.includes('architecture') || lowerInput.includes('design pattern') || lowerInput.includes('system design')) {
            return 'architecture_design';
        }
        // Testing keywords
        if (lowerInput.includes('test') || lowerInput.includes('unit test') || lowerInput.includes('testing strategy')) {
            return 'testing';
        }
        // Performance keywords
        if (lowerInput.includes('performance') || lowerInput.includes('optimize') || lowerInput.includes('speed up')) {
            return 'performance_optimization';
        }
        // Documentation keywords
        if (lowerInput.includes('document') || lowerInput.includes('comment') || lowerInput.includes('explain code')) {
            return 'documentation';
        }
        // Refactoring keywords
        if (lowerInput.includes('refactor') || lowerInput.includes('clean up') || lowerInput.includes('restructure')) {
            return 'refactoring';
        }
        // Security keywords
        if (lowerInput.includes('security') || lowerInput.includes('vulnerability') || lowerInput.includes('secure')) {
            return 'security_analysis';
        }
        return null;
    }
    /**
     * Detect programming language mentioned in the input
     */
    detectProgrammingLanguage(input) {
        const lowerInput = input.toLowerCase();
        // Common programming languages
        const languages = [
            'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
            'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql',
            'html', 'css', 'react', 'vue', 'angular', 'node.js', 'express'
        ];
        for (const lang of languages) {
            if (lowerInput.includes(lang)) {
                return lang;
            }
        }
        // Check for specific frameworks or technologies
        if (lowerInput.includes('react'))
            return 'React';
        if (lowerInput.includes('vue'))
            return 'Vue.js';
        if (lowerInput.includes('angular'))
            return 'Angular';
        if (lowerInput.includes('node'))
            return 'Node.js';
        if (lowerInput.includes('express'))
            return 'Express.js';
        if (lowerInput.includes('django'))
            return 'Django';
        if (lowerInput.includes('flask'))
            return 'Flask';
        if (lowerInput.includes('spring'))
            return 'Spring';
        return null;
    }
    /**
     * Assess the complexity level of the technical task
     */
    assessComplexity(input) {
        const lowerInput = input.toLowerCase();
        // High complexity indicators
        if (lowerInput.includes('system design') || lowerInput.includes('architecture') ||
            lowerInput.includes('distributed') || lowerInput.includes('microservices') ||
            lowerInput.includes('scalability') || lowerInput.includes('enterprise')) {
            return 'high';
        }
        // Medium complexity indicators
        if (lowerInput.includes('algorithm') || lowerInput.includes('optimization') ||
            lowerInput.includes('database') || lowerInput.includes('api') ||
            lowerInput.includes('framework') || lowerInput.includes('integration')) {
            return 'medium';
        }
        // Low complexity indicators
        if (lowerInput.includes('simple') || lowerInput.includes('basic') ||
            lowerInput.includes('beginner') || lowerInput.includes('tutorial')) {
            return 'low';
        }
        return 'medium'; // Default to medium complexity
    }
    /**
     * Identify the technical domain
     */
    identifyTechnicalDomain(input) {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('web') || lowerInput.includes('frontend') || lowerInput.includes('backend')) {
            return 'web_development';
        }
        if (lowerInput.includes('mobile') || lowerInput.includes('android') || lowerInput.includes('ios')) {
            return 'mobile_development';
        }
        if (lowerInput.includes('data') || lowerInput.includes('machine learning') || lowerInput.includes('ai')) {
            return 'data_science';
        }
        if (lowerInput.includes('devops') || lowerInput.includes('deployment') || lowerInput.includes('ci/cd')) {
            return 'devops';
        }
        if (lowerInput.includes('game') || lowerInput.includes('unity') || lowerInput.includes('graphics')) {
            return 'game_development';
        }
        if (lowerInput.includes('embedded') || lowerInput.includes('iot') || lowerInput.includes('hardware')) {
            return 'embedded_systems';
        }
        return 'general_programming';
    }
    /**
     * Get technical agent information
     */
    getInfo() {
        const baseInfo = super.getInfo();
        return {
            ...baseInfo,
            specialization: 'technical',
            technicalCapabilities: [
                'Code Generation',
                'Debugging & Troubleshooting',
                'Code Review & Optimization',
                'Architecture Design',
                'Testing Strategies',
                'Performance Optimization',
                'Security Analysis',
                'Documentation',
                'Refactoring',
                'Technical Analysis'
            ],
            supportedLanguages: [
                'JavaScript/TypeScript',
                'Python',
                'Java',
                'C/C++',
                'C#',
                'Go',
                'Rust',
                'PHP',
                'Ruby',
                'Swift',
                'Kotlin',
                'SQL'
            ],
            technicalDomains: [
                'Web Development',
                'Mobile Development',
                'Data Science & AI',
                'DevOps & Infrastructure',
                'Game Development',
                'Embedded Systems',
                'Cloud Computing',
                'Database Design'
            ],
            optimalFor: [
                'Software Development',
                'Code Reviews',
                'Technical Architecture',
                'Debugging Complex Issues',
                'Performance Optimization',
                'Security Audits',
                'Technical Documentation',
                'Development Best Practices'
            ]
        };
    }
}
exports.TechnicalAgent = TechnicalAgent;
