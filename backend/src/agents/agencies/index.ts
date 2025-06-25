/**
 * Agencies Exports
 * 
 * Export point for all LangGraph-based multi-agent agencies.
 * Agencies orchestrate multiple individual agents for complex workflows.
 */

// Import and export customer support agency
export { CustomerSupportAgency } from './customer-support/agency';
export { CustomerSupportWorkflow } from './customer-support/workflow';
export type { 
    WorkflowStage, 
    CustomerSentiment, 
    IssueCategory, 
    Resolution,
    WorkflowMetadata,
    CustomerSupportWorkflowState,
    WorkflowConfig
} from './customer-support/workflow';

// Future agencies will be exported here
// Example: export { ContentCreationAgency } from './content-creation/agency';

// Agencies registry for dynamic access
export const AGENCIES_REGISTRY = {
    'customer-support': {
        name: 'CustomerSupportAgency',
        type: 'agency',
        version: '1.0.0',
        description: 'Multi-agent workflow for comprehensive customer support using LangGraph orchestration',
        workflow: 'LangGraph StateGraph',
        individualAgents: ['analytical', 'support-specialist'],
        features: [
            'sentiment_analysis',
            'issue_classification', 
            'multi_agent_orchestration',
            'workflow_management',
            'customer_interaction'
        ]
    }
    // Future agencies will be registered here
};

/**
 * Get information about all available agencies
 */
export const getAvailableAgencies = () => {
    return Object.entries(AGENCIES_REGISTRY).map(([key, info]) => ({
        key,
        ...info
    }));
};

/**
 * Check if an agency is available
 */
export const isAgencyAvailable = (agencyKey: string): boolean => {
    return agencyKey in AGENCIES_REGISTRY;
};

/**
 * Get agency information by key
 */
export const getAgencyInfo = (agencyKey: string) => {
    return AGENCIES_REGISTRY[agencyKey as keyof typeof AGENCIES_REGISTRY] || null;
};

export default AGENCIES_REGISTRY; 