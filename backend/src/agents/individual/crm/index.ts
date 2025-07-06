/**
 * CRM Agent Module
 * Exports the CRM agent and related components
 */

export { CRMAgent } from './agent';
export { CRMWorkflowState, CRMStateAnnotation, CRMWorkflowHelper } from './workflow';
export { default as config } from './config.json';

// Agent factory function for lazy loading
export const createCRMAgent = async () => {
  const { CRMAgent } = await import('./agent');
  const agent = new CRMAgent();
  await agent.initialize();
  return agent;
};