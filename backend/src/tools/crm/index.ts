/**
 * CRM Tools Module
 * Exports all CRM-related tools for use in agents
 */

export { InsightlyApiTool } from './InsightlyApiTool';
export { ContactManagerTool } from './ContactManagerTool';
export { OpportunityTool } from './OpportunityTool';
export * from './types';
export { getCRMConfig, getConfigSummary, maskApiKey } from './config';

// Tool collection for easy registration
export const CRM_TOOLS = [
  'InsightlyApiTool',
  'ContactManagerTool',
  'OpportunityTool'
];

// Tool descriptions for agent awareness
export const CRM_TOOL_DESCRIPTIONS = {
  'insightly-api': 'Base API client for Insightly CRM operations',
  'contact-manager': 'Search and manage CRM contacts with enrichment',
  'opportunity-manager': 'Analyze opportunities and sales pipelines'
};