/**
 * Individual Agent Factory
 * 
 * Factory for creating and managing individual agents in their isolated environments.
 * Replaces the old specialized agent factory with full-featured individual agents.
 */

import { BaseAgent } from '../core/BaseAgent';

// Import individual agents
import { AnalyticalAgent } from './analytical/agent';
import { CreativeAgent } from './creative/agent';
import { TechnicalAgent } from './technical/agent';

/**
 * Factory for creating individual agents
 */
export class IndividualAgentFactory {
    
    /**
     * Create all available individual agents with fallback handling
     */
    static createAgentsWithFallback(): {
        agents: BaseAgent[];
        success: boolean;
        errors: string[];
        warnings: string[];
    } {
        const agents: BaseAgent[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];
        let success = false;

        try {
            // Create Analytical Agent
            try {
                const analyticalAgent = new AnalyticalAgent();
                agents.push(analyticalAgent);
                console.log('[IndividualAgentFactory] Created AnalyticalAgent successfully');
            } catch (error) {
                const errorMsg = `Failed to create AnalyticalAgent: ${(error as Error).message}`;
                errors.push(errorMsg);
                console.error('[IndividualAgentFactory]', errorMsg);
            }

            // Create Creative Agent
            try {
                const creativeAgent = new CreativeAgent();
                agents.push(creativeAgent);
                console.log('[IndividualAgentFactory] Created CreativeAgent successfully');
            } catch (error) {
                const errorMsg = `Failed to create CreativeAgent: ${(error as Error).message}`;
                errors.push(errorMsg);
                console.error('[IndividualAgentFactory]', errorMsg);
            }

            // Create Technical Agent
            try {
                const technicalAgent = new TechnicalAgent();
                agents.push(technicalAgent);
                console.log('[IndividualAgentFactory] Created TechnicalAgent successfully');
            } catch (error) {
                const errorMsg = `Failed to create TechnicalAgent: ${(error as Error).message}`;
                errors.push(errorMsg);
                console.error('[IndividualAgentFactory]', errorMsg);
            }

            // Determine success
            if (agents.length > 0) {
                success = true;
                console.log(`[IndividualAgentFactory] Successfully created ${agents.length} individual agents`);
            } else {
                errors.push('No agents were created successfully');
            }

            // Add warnings for any missing agents
            if (agents.length < 3) {
                warnings.push(`Only ${agents.length} out of 3 expected agents were created`);
            }

        } catch (error) {
            const errorMsg = `Factory initialization failed: ${(error as Error).message}`;
            errors.push(errorMsg);
            console.error('[IndividualAgentFactory]', errorMsg);
        }

        return {
            agents,
            success,
            errors,
            warnings
        };
    }

    /**
     * Create a specific individual agent by name
     */
    static createAgent(agentName: string): BaseAgent | null {
        try {
            switch (agentName.toLowerCase()) {
                case 'analytical':
                case 'analyticalagent':
                    return new AnalyticalAgent();
                
                case 'creative':
                case 'creativeagent':
                    return new CreativeAgent();
                
                case 'technical':
                case 'technicalagent':
                    return new TechnicalAgent();
                
                default:
                    console.warn(`[IndividualAgentFactory] Unknown agent name: ${agentName}`);
                    return null;
            }
        } catch (error) {
            console.error(`[IndividualAgentFactory] Failed to create agent ${agentName}:`, error);
            return null;
        }
    }

    /**
     * Get list of available agent types
     */
    static getAvailableAgents(): string[] {
        return ['AnalyticalAgent', 'CreativeAgent', 'TechnicalAgent'];
    }

    /**
     * Check if an agent type is available
     */
    static isAgentAvailable(agentName: string): boolean {
        const availableAgents = this.getAvailableAgents();
        return availableAgents.some(name => 
            name.toLowerCase() === agentName.toLowerCase() ||
            name.toLowerCase().replace('agent', '') === agentName.toLowerCase()
        );
    }

    /**
     * Get agent information without creating instances
     */
    static getAgentInfo(): Array<{
        name: string;
        type: string;
        description: string;
        capabilities: string[];
    }> {
        return [
            {
                name: 'AnalyticalAgent',
                type: 'analytical',
                description: 'Specialized agent for data analysis, statistical processing, and mathematical computations',
                capabilities: ['statistical_analysis', 'data_visualization_guidance', 'mathematical_computation', 'data_research_assistance']
            },
            {
                name: 'CreativeAgent', 
                type: 'creative',
                description: 'Specialized agent for creative writing, brainstorming, storytelling, and innovative thinking',
                capabilities: ['creative_writing', 'brainstorming', 'storytelling', 'ideation', 'character_development']
            },
            {
                name: 'TechnicalAgent',
                type: 'technical', 
                description: 'Specialized agent for coding, debugging, technical problem-solving, and software development',
                capabilities: ['code_generation', 'debugging_assistance', 'architecture_design', 'performance_optimization', 'code_review']
            }
        ];
    }

    /**
     * Initialize all agents asynchronously
     */
    static async initializeAllAgents(): Promise<{
        initialized: BaseAgent[];
        failed: Array<{ agent: string; error: string }>;
    }> {
        const result = this.createAgentsWithFallback();
        const initialized: BaseAgent[] = [];
        const failed: Array<{ agent: string; error: string }> = [];

        for (const agent of result.agents) {
            try {
                await agent.initialize();
                initialized.push(agent);
                console.log(`[IndividualAgentFactory] Initialized ${agent.getInfo().name} successfully`);
            } catch (error) {
                const errorMsg = `Failed to initialize ${agent.getInfo().name}: ${(error as Error).message}`;
                failed.push({ agent: agent.getInfo().name, error: errorMsg });
                console.error('[IndividualAgentFactory]', errorMsg);
            }
        }

        return { initialized, failed };
    }
}

// Backward compatibility exports
export const OrchestratorAgentFactory = IndividualAgentFactory; 