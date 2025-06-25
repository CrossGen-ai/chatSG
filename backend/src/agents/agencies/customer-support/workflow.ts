/**
 * Customer Support Workflow
 * 
 * Defines the LangGraph workflow structure and state management
 * for customer support agency operations.
 */

/**
 * Workflow stage definitions
 */
export type WorkflowStage = 
    | 'intake'
    | 'sentiment_analysis'
    | 'issue_classification'
    | 'resolution'
    | 'summary'
    | 'completed'
    | 'escalation';

/**
 * Issue categories for classification
 */
export type IssueCategory = 
    | 'billing'
    | 'technical'
    | 'account'
    | 'cancellation'
    | 'general'
    | 'escalation';

/**
 * Customer sentiment levels
 */
export type CustomerSentiment = 
    | 'positive'
    | 'neutral'
    | 'negative'
    | 'frustrated'
    | 'satisfied';

/**
 * Resolution information
 */
export interface Resolution {
    type: string;
    solution: string;
    sentiment?: CustomerSentiment;
    timestamp: string;
    confidence?: number;
    escalationRequired?: boolean;
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
    startTime: string;
    agencyName: string;
    intakeCompleted?: string;
    sentimentAnalysisCompleted?: string;
    classificationCompleted?: string;
    resolutionCompleted?: string;
    summaryCompleted?: string;
    workflowCompleted?: boolean;
    originalRequest?: string;
    sentimentConfidence?: number;
    classificationMethod?: string;
    resolutionAgent?: string;
    totalProcessingTime?: number;
    stageTransitions?: Array<{
        from: WorkflowStage;
        to: WorkflowStage;
        timestamp: string;
    }>;
}

/**
 * Complete workflow state interface
 */
export interface CustomerSupportWorkflowState {
    messages: any[];
    sessionId: string;
    currentStage: WorkflowStage;
    customerSentiment: CustomerSentiment;
    issueCategory: IssueCategory;
    resolution: Resolution | null;
    metadata: WorkflowMetadata;
}

/**
 * Workflow configuration options
 */
export interface WorkflowConfig {
    enableSentimentAnalysis: boolean;
    enableIssueClassification: boolean;
    enableEscalation: boolean;
    maxProcessingTime: number; // in milliseconds
    sentimentThreshold: number; // confidence threshold for sentiment
    escalationSentiments: CustomerSentiment[];
    escalationCategories: IssueCategory[];
}

/**
 * Customer Support Workflow implementation
 */
export class CustomerSupportWorkflow {
    private config: WorkflowConfig;

    constructor(config?: Partial<WorkflowConfig>) {
        this.config = {
            enableSentimentAnalysis: true,
            enableIssueClassification: true,
            enableEscalation: true,
            maxProcessingTime: 300000, // 5 minutes
            sentimentThreshold: 0.7,
            escalationSentiments: ['negative', 'frustrated'],
            escalationCategories: ['technical', 'billing'],
            ...config
        };

        console.log('[CustomerSupportWorkflow] Initialized with config:', this.config);
    }

    /**
     * Get workflow configuration
     */
    getConfig(): WorkflowConfig {
        return { ...this.config };
    }

    /**
     * Update workflow configuration
     */
    updateConfig(newConfig: Partial<WorkflowConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('[CustomerSupportWorkflow] Configuration updated:', this.config);
    }

    /**
     * Determine next stage based on current state
     */
    getNextStage(currentStage: WorkflowStage, state: Partial<CustomerSupportWorkflowState>): WorkflowStage {
        switch (currentStage) {
            case 'intake':
                return this.config.enableSentimentAnalysis ? 'sentiment_analysis' : 'issue_classification';
            
            case 'sentiment_analysis':
                // Check if escalation is needed based on sentiment
                if (this.shouldEscalate(state)) {
                    return 'escalation';
                }
                return this.config.enableIssueClassification ? 'issue_classification' : 'resolution';
            
            case 'issue_classification':
                // Check if escalation is needed based on issue category
                if (this.shouldEscalate(state)) {
                    return 'escalation';
                }
                return 'resolution';
            
            case 'resolution':
                return 'summary';
            
            case 'summary':
                return 'completed';
            
            case 'escalation':
                return 'completed';
            
            default:
                return 'completed';
        }
    }

    /**
     * Check if the request should be escalated
     */
    shouldEscalate(state: Partial<CustomerSupportWorkflowState>): boolean {
        if (!this.config.enableEscalation) {
            return false;
        }

        // Escalate based on negative sentiment
        if (state.customerSentiment && 
            this.config.escalationSentiments.includes(state.customerSentiment)) {
            return true;
        }

        // Escalate based on complex issue categories
        if (state.issueCategory && 
            this.config.escalationCategories.includes(state.issueCategory)) {
            return true;
        }

        // Escalate based on processing time
        if (state.metadata?.startTime) {
            const startTime = new Date(state.metadata.startTime).getTime();
            const currentTime = new Date().getTime();
            const processingTime = currentTime - startTime;
            
            if (processingTime > this.config.maxProcessingTime) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validate workflow state
     */
    validateState(state: Partial<CustomerSupportWorkflowState>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!state.sessionId) {
            errors.push('Session ID is required');
        }

        if (!state.messages || !Array.isArray(state.messages)) {
            errors.push('Messages array is required');
        }

        if (state.currentStage && !this.isValidStage(state.currentStage)) {
            errors.push(`Invalid workflow stage: ${state.currentStage}`);
        }

        if (state.customerSentiment && !this.isValidSentiment(state.customerSentiment)) {
            errors.push(`Invalid customer sentiment: ${state.customerSentiment}`);
        }

        if (state.issueCategory && !this.isValidCategory(state.issueCategory)) {
            errors.push(`Invalid issue category: ${state.issueCategory}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if stage is valid
     */
    private isValidStage(stage: string): stage is WorkflowStage {
        const validStages: WorkflowStage[] = [
            'intake', 'sentiment_analysis', 'issue_classification', 
            'resolution', 'summary', 'completed', 'escalation'
        ];
        return validStages.includes(stage as WorkflowStage);
    }

    /**
     * Check if sentiment is valid
     */
    private isValidSentiment(sentiment: string): sentiment is CustomerSentiment {
        const validSentiments: CustomerSentiment[] = [
            'positive', 'neutral', 'negative', 'frustrated', 'satisfied'
        ];
        return validSentiments.includes(sentiment as CustomerSentiment);
    }

    /**
     * Check if category is valid
     */
    private isValidCategory(category: string): category is IssueCategory {
        const validCategories: IssueCategory[] = [
            'billing', 'technical', 'account', 'cancellation', 'general', 'escalation'
        ];
        return validCategories.includes(category as IssueCategory);
    }

    /**
     * Create initial workflow state
     */
    createInitialState(sessionId: string, userMessage: any): CustomerSupportWorkflowState {
        return {
            messages: [userMessage],
            sessionId,
            currentStage: 'intake',
            customerSentiment: 'neutral',
            issueCategory: 'general',
            resolution: null,
            metadata: {
                startTime: new Date().toISOString(),
                agencyName: 'CustomerSupportAgency',
                stageTransitions: []
            }
        };
    }

    /**
     * Update state with stage transition
     */
    updateStateWithTransition(
        state: CustomerSupportWorkflowState, 
        newStage: WorkflowStage,
        additionalData?: Partial<CustomerSupportWorkflowState>
    ): CustomerSupportWorkflowState {
        const transition = {
            from: state.currentStage,
            to: newStage,
            timestamp: new Date().toISOString()
        };

        return {
            ...state,
            ...additionalData,
            currentStage: newStage,
            metadata: {
                ...state.metadata,
                ...additionalData?.metadata,
                stageTransitions: [
                    ...(state.metadata.stageTransitions || []),
                    transition
                ]
            }
        };
    }

    /**
     * Calculate workflow statistics
     */
    calculateWorkflowStats(state: CustomerSupportWorkflowState): {
        totalProcessingTime: number;
        stageCount: number;
        averageStageTime: number;
        isCompleted: boolean;
        escalated: boolean;
    } {
        const startTime = new Date(state.metadata.startTime).getTime();
        const currentTime = new Date().getTime();
        const totalProcessingTime = currentTime - startTime;

        const stageTransitions = state.metadata.stageTransitions || [];
        const stageCount = stageTransitions.length;
        const averageStageTime = stageCount > 0 ? totalProcessingTime / stageCount : 0;

        const isCompleted = state.currentStage === 'completed';
        const escalated = state.currentStage === 'escalation' || 
                         stageTransitions.some(t => t.to === 'escalation');

        return {
            totalProcessingTime,
            stageCount,
            averageStageTime,
            isCompleted,
            escalated
        };
    }

    /**
     * Get workflow progress summary
     */
    getProgressSummary(state: CustomerSupportWorkflowState): {
        currentStage: WorkflowStage;
        progress: number; // percentage
        stagesCompleted: WorkflowStage[];
        nextStage: WorkflowStage | null;
        estimatedTimeRemaining: number;
    } {
        const allStages: WorkflowStage[] = [
            'intake', 'sentiment_analysis', 'issue_classification', 
            'resolution', 'summary', 'completed'
        ];

        const stageTransitions = state.metadata.stageTransitions || [];
        const completedStages = stageTransitions.map(t => t.from);
        
        const currentStageIndex = allStages.indexOf(state.currentStage);
        const progress = currentStageIndex >= 0 ? 
            ((currentStageIndex + 1) / allStages.length) * 100 : 0;

        const nextStage = this.getNextStage(state.currentStage, state);
        const estimatedTimeRemaining = this.estimateRemainingTime(state);

        return {
            currentStage: state.currentStage,
            progress,
            stagesCompleted: completedStages,
            nextStage: nextStage !== 'completed' ? nextStage : null,
            estimatedTimeRemaining
        };
    }

    /**
     * Estimate remaining processing time
     */
    private estimateRemainingTime(state: CustomerSupportWorkflowState): number {
        const stats = this.calculateWorkflowStats(state);
        
        // Simple estimation based on average stage time
        const remainingStages = this.getRemainingStages(state.currentStage);
        return remainingStages.length * stats.averageStageTime;
    }

    /**
     * Get remaining workflow stages
     */
    private getRemainingStages(currentStage: WorkflowStage): WorkflowStage[] {
        const allStages: WorkflowStage[] = [
            'intake', 'sentiment_analysis', 'issue_classification', 
            'resolution', 'summary', 'completed'
        ];

        const currentIndex = allStages.indexOf(currentStage);
        return currentIndex >= 0 ? allStages.slice(currentIndex + 1) : [];
    }

    /**
     * Generate workflow report
     */
    generateWorkflowReport(state: CustomerSupportWorkflowState): any {
        const stats = this.calculateWorkflowStats(state);
        const progress = this.getProgressSummary(state);

        return {
            sessionId: state.sessionId,
            workflowStats: stats,
            progressSummary: progress,
            finalState: {
                sentiment: state.customerSentiment,
                category: state.issueCategory,
                resolution: state.resolution,
                escalated: stats.escalated
            },
            timeline: state.metadata.stageTransitions,
            configuration: this.config
        };
    }
} 