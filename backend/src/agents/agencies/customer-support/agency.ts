/**
 * Customer Support Agency
 * 
 * LangGraph-based agency that orchestrates multiple individual agents
 * to provide comprehensive customer support workflows.
 */

import { AbstractBaseAgent } from '../../core/BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult } from '../../../types';
import { AgentOrchestrator } from '../../../routing/AgentOrchestrator';
import { AgentFactory } from '../../core/AgentFactory';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { CustomerSupportWorkflow } from './workflow';

/**
 * Agency state structure
 */
const AgencyStateAnnotation = Annotation.Root({
    messages: Annotation({
        reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
        default: () => [],
    }),
    sessionId: Annotation({
        reducer: (left, right) => right ?? left,
        default: () => 'default',
    }),
    currentStage: Annotation({
        reducer: (left, right) => right ?? left,
        default: () => 'intake',
    }),
    customerSentiment: Annotation({
        reducer: (left, right) => right ?? left,
        default: () => 'neutral',
    }),
    issueCategory: Annotation({
        reducer: (left, right) => right ?? left,
        default: () => 'general',
    }),
    resolution: Annotation({
        reducer: (left, right) => right ?? left,
        default: () => null,
    }),
    metadata: Annotation({
        reducer: (left, right) => ({ ...left, ...right }),
        default: () => ({}),
    }),
});

/**
 * Customer Support Agency implementation
 */
export class CustomerSupportAgency extends AbstractBaseAgent {
    private orchestrator: AgentOrchestrator;
    private agentFactory: AgentFactory;
    private workflow: CustomerSupportWorkflow;
    private graph: any; // StateGraph instance
    private initialized: boolean = false;

    // Individual agents used by this agency
    private analyticalAgent: any = null;
    private supportSpecialistAgent: any = null;

    constructor() {
        super(
            'CustomerSupportAgency',
            '1.0.0',
            'Multi-agent workflow for comprehensive customer support using LangGraph orchestration',
            'agency'
        );

        this.orchestrator = new AgentOrchestrator();
        this.agentFactory = AgentFactory.getInstance();
        this.workflow = new CustomerSupportWorkflow();
    }

    /**
     * Initialize the agency and its workflow
     */
    async initialize(config?: any): Promise<void> {
        if (this.initialized) return;

        try {
            console.log(`[${this.name}] Initializing customer support agency...`);

            // Initialize individual agents
            await this.initializeAgents();

            // Create and register the LangGraph workflow
            this.graph = await this.createWorkflowGraph();

            this.initialized = true;
            console.log(`[${this.name}] Customer support agency initialized successfully`);
        } catch (error) {
            console.error(`[${this.name}] Failed to initialize:`, error);
            throw error;
        }
    }

    /**
     * Process customer support requests through the workflow
     */
    async processMessage(input: string, sessionId: string): Promise<AgentResponse> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            console.log(`[${this.name}] Processing customer support request for session: ${sessionId}`);

            const humanMessage = new HumanMessage({ content: input });
            
            const initialState = {
                messages: [humanMessage],
                sessionId: sessionId,
                currentStage: 'intake',
                customerSentiment: 'neutral',
                issueCategory: 'general',
                resolution: null,
                metadata: {
                    startTime: new Date().toISOString(),
                    agencyName: this.name
                }
            };

            // Execute the workflow
            const result = await this.graph.invoke(initialState);
            
            // Extract the final response
            const finalMessages = result.messages || [];
            const lastMessage = finalMessages[finalMessages.length - 1];
            const response = lastMessage?.content || 'I apologize, but I was unable to process your request. Please try again.';

            return {
                success: true,
                message: response,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: {
                    agencyName: this.name,
                    workflowStage: result.currentStage,
                    customerSentiment: result.customerSentiment,
                    issueCategory: result.issueCategory,
                    resolution: result.resolution,
                    capabilities: this.getCapabilities(),
                    workflowMetadata: result.metadata
                }
            };
        } catch (error) {
            console.error(`[${this.name}] Error processing message:`, error);
            return {
                success: false,
                message: `I encountered an error while processing your customer support request: ${(error as Error).message}. Let me connect you with a human agent.`,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: { 
                    error: true, 
                    agencyName: this.name,
                    fallbackRecommended: true
                }
            };
        }
    }

    /**
     * Initialize individual agents used by the agency
     */
    private async initializeAgents(): Promise<void> {
        try {
            // Initialize analytical agent for sentiment analysis
            this.analyticalAgent = await this.agentFactory.createAgent('analytical');
            this.orchestrator.registerAgent(this.analyticalAgent);

            // Create a specialized support agent for this agency
            this.supportSpecialistAgent = await this.createSupportSpecialistAgent();
            this.orchestrator.registerAgent(this.supportSpecialistAgent);

            console.log(`[${this.name}] Individual agents initialized and registered`);
        } catch (error) {
            console.error(`[${this.name}] Failed to initialize agents:`, error);
            throw error;
        }
    }

    /**
     * Create a specialized support agent for customer interactions
     */
    private async createSupportSpecialistAgent(): Promise<any> {
        // This is a simple implementation - in practice, this could be
        // another individual agent or a specialized variant
        return {
            processMessage: async (input: string, sessionId: string) => {
                return {
                    success: true,
                    message: `Thank you for contacting support. I understand your concern: "${input}". Let me help you resolve this issue.`,
                    sessionId,
                    timestamp: new Date().toISOString()
                };
            },
            getInfo: () => ({
                name: 'SupportSpecialistAgent',
                version: '1.0.0',
                description: 'Specialized agent for customer support interactions',
                type: 'support'
            }),
            getCapabilities: () => ({
                name: 'SupportSpecialistAgent',
                version: '1.0.0',
                supportedModes: ['support', 'assistance', 'resolution'],
                features: ['customer_interaction', 'issue_resolution', 'escalation_handling'],
                inputTypes: ['text', 'complaints', 'questions'],
                outputTypes: ['support_responses', 'resolutions', 'escalations'],
                supportsTools: true,
                supportsStateSharing: true
            }),
            validateConfig: () => ({ valid: true, errors: [], warnings: [] })
        };
    }

    /**
     * Create the LangGraph workflow
     */
    private async createWorkflowGraph(): Promise<any> {
        try {
            const workflow = new StateGraph(AgencyStateAnnotation);

            // Add workflow nodes
            workflow.addNode('intake', this.intakeNode.bind(this));
            workflow.addNode('sentiment_analysis', this.sentimentAnalysisNode.bind(this));
            workflow.addNode('issue_classification', this.issueClassificationNode.bind(this));
            workflow.addNode('resolution', this.resolutionNode.bind(this));
            workflow.addNode('summary', this.summaryNode.bind(this));

            // Define workflow edges
            workflow.setEntryPoint('intake');
            workflow.addEdge('intake', 'sentiment_analysis');
            workflow.addEdge('sentiment_analysis', 'issue_classification');
            workflow.addEdge('issue_classification', 'resolution');
            workflow.addEdge('resolution', 'summary');
            workflow.addEdge('summary', END);

            console.log(`[${this.name}] LangGraph workflow created successfully`);
            return workflow.compile();
        } catch (error) {
            console.error(`[${this.name}] Failed to create workflow:`, error);
            throw error;
        }
    }

    /**
     * Intake node - initial customer interaction
     */
    private async intakeNode(state: any): Promise<any> {
        console.log(`[${this.name}] Processing intake stage`);
        
        const latestMessage = state.messages[state.messages.length - 1];
        const userInput = latestMessage.content || '';

        const intakeResponse = new AIMessage({
            content: `Hello! I'm here to help you with your support request. I've received your message: "${userInput}". Let me analyze this and connect you with the right resources.`
        });

        return {
            messages: [intakeResponse],
            currentStage: 'sentiment_analysis',
            metadata: {
                ...state.metadata,
                intakeCompleted: new Date().toISOString(),
                originalRequest: userInput
            }
        };
    }

    /**
     * Sentiment analysis node - delegates to analytical agent
     */
    private async sentimentAnalysisNode(state: any): Promise<any> {
        console.log(`[${this.name}] Processing sentiment analysis stage`);

        try {
            const latestMessage = state.messages[state.messages.length - 1];
            const userInput = state.metadata.originalRequest || latestMessage.content;

            // Use analytical agent for sentiment analysis
            if (this.analyticalAgent) {
                const sentimentPrompt = `Analyze the sentiment of this customer message: "${userInput}". Respond with only: positive, negative, or neutral.`;
                const sentimentResponse = await this.analyticalAgent.processMessage(sentimentPrompt, state.sessionId);
                
                const sentiment = this.extractSentiment(sentimentResponse.message);
                
                const analysisResponse = new AIMessage({
                    content: `I've analyzed the tone of your message and detected a ${sentiment} sentiment. This helps me provide better assistance.`
                });

                return {
                    messages: [analysisResponse],
                    currentStage: 'issue_classification',
                    customerSentiment: sentiment,
                    metadata: {
                        ...state.metadata,
                        sentimentAnalysisCompleted: new Date().toISOString(),
                        sentimentConfidence: sentimentResponse.metadata?.confidence || 0.8
                    }
                };
            }
        } catch (error) {
            console.error(`[${this.name}] Sentiment analysis failed:`, error);
        }

        // Fallback if analytical agent unavailable
        return {
            messages: [new AIMessage({ content: 'Proceeding with your request...' })],
            currentStage: 'issue_classification',
            customerSentiment: 'neutral'
        };
    }

    /**
     * Issue classification node - categorizes the support request
     */
    private async issueClassificationNode(state: any): Promise<any> {
        console.log(`[${this.name}] Processing issue classification stage`);

        const userInput = state.metadata.originalRequest || '';
        const category = this.classifyIssue(userInput);

        const classificationResponse = new AIMessage({
            content: `I've categorized your request as: ${category}. This helps me route you to the right solution.`
        });

        return {
            messages: [classificationResponse],
            currentStage: 'resolution',
            issueCategory: category,
            metadata: {
                ...state.metadata,
                classificationCompleted: new Date().toISOString(),
                classificationMethod: 'keyword-based'
            }
        };
    }

    /**
     * Resolution node - provides solution using support specialist
     */
    private async resolutionNode(state: any): Promise<any> {
        console.log(`[${this.name}] Processing resolution stage`);

        try {
            const userInput = state.metadata.originalRequest || '';
            const category = state.issueCategory;
            const sentiment = state.customerSentiment;

            // Use support specialist agent for resolution
            if (this.supportSpecialistAgent) {
                const resolutionPrompt = `Customer issue (${category}, ${sentiment} sentiment): ${userInput}`;
                const resolutionResponse = await this.supportSpecialistAgent.processMessage(resolutionPrompt, state.sessionId);

                const resolution = resolutionResponse.message;

                return {
                    messages: [new AIMessage({ content: resolution })],
                    currentStage: 'summary',
                    resolution: {
                        type: category,
                        solution: resolution,
                        sentiment: sentiment,
                        timestamp: new Date().toISOString()
                    },
                    metadata: {
                        ...state.metadata,
                        resolutionCompleted: new Date().toISOString(),
                        resolutionAgent: 'SupportSpecialistAgent'
                    }
                };
            }
        } catch (error) {
            console.error(`[${this.name}] Resolution failed:`, error);
        }

        // Fallback resolution
        const fallbackResolution = `I've reviewed your ${state.issueCategory} request. While I can provide general guidance, you may need to contact a specialist for detailed assistance. Is there anything specific I can help clarify?`;

        return {
            messages: [new AIMessage({ content: fallbackResolution })],
            currentStage: 'summary',
            resolution: {
                type: 'fallback',
                solution: fallbackResolution,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Summary node - provides final summary and next steps
     */
    private async summaryNode(state: any): Promise<any> {
        console.log(`[${this.name}] Processing summary stage`);

        const category = state.issueCategory;
        const sentiment = state.customerSentiment;
        const resolution = state.resolution;

        const summaryMessage = `
Summary of your support interaction:
• Issue Category: ${category}
• Sentiment: ${sentiment}
• Resolution Status: ${resolution?.type || 'In Progress'}

Thank you for contacting support! Is there anything else I can help you with today?
        `.trim();

        const summaryResponse = new AIMessage({ content: summaryMessage });

        return {
            messages: [summaryResponse],
            currentStage: 'completed',
            metadata: {
                ...state.metadata,
                summaryCompleted: new Date().toISOString(),
                workflowCompleted: true
            }
        };
    }

    /**
     * Extract sentiment from analytical agent response
     */
    private extractSentiment(response: string): string {
        const lowerResponse = response.toLowerCase();
        if (lowerResponse.includes('positive')) return 'positive';
        if (lowerResponse.includes('negative')) return 'negative';
        return 'neutral';
    }

    /**
     * Classify issue type based on keywords
     */
    private classifyIssue(input: string): string {
        const lowerInput = input.toLowerCase();
        
        if (lowerInput.includes('billing') || lowerInput.includes('charge') || lowerInput.includes('payment')) {
            return 'billing';
        }
        if (lowerInput.includes('technical') || lowerInput.includes('bug') || lowerInput.includes('error')) {
            return 'technical';
        }
        if (lowerInput.includes('account') || lowerInput.includes('login') || lowerInput.includes('password')) {
            return 'account';
        }
        if (lowerInput.includes('cancel') || lowerInput.includes('refund') || lowerInput.includes('return')) {
            return 'cancellation';
        }
        
        return 'general';
    }

    /**
     * Get agency capabilities
     */
    getCapabilities(): AgentCapabilities {
        return {
            name: this.name,
            version: this.version,
            supportedModes: ['customer_support', 'issue_resolution', 'multi_agent_workflow'],
            features: [
                'sentiment_analysis',
                'issue_classification',
                'multi_agent_orchestration',
                'workflow_management',
                'customer_interaction'
            ],
            inputTypes: ['text', 'customer_requests', 'support_tickets'],
            outputTypes: ['support_responses', 'resolutions', 'summaries'],
            maxSessionMemory: 2000,
            supportsTools: true,
            supportsStateSharing: true
        };
    }

    /**
     * Validate agency configuration
     */
    validateConfig(): ValidationResult {
        try {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!this.name || !this.version) {
                errors.push('Agency name and version are required');
            }

            if (!this.initialized) {
                warnings.push('Agency not yet initialized');
            }

            if (!this.analyticalAgent) {
                warnings.push('Analytical agent not available - sentiment analysis may be limited');
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Configuration validation failed: ${(error as Error).message}`],
                warnings: []
            };
        }
    }

    /**
     * Get workflow status
     */
    getWorkflowStatus(): any {
        return {
            initialized: this.initialized,
            availableAgents: {
                analytical: !!this.analyticalAgent,
                supportSpecialist: !!this.supportSpecialistAgent
            },
            orchestratorStats: this.orchestrator?.getStats() || {},
            workflowStages: [
                'intake',
                'sentiment_analysis', 
                'issue_classification',
                'resolution',
                'summary'
            ]
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        if (this.analyticalAgent && this.analyticalAgent.cleanup) {
            await this.analyticalAgent.cleanup();
        }
        
        if (this.orchestrator && this.orchestrator.cleanup) {
            await this.orchestrator.cleanup();
        }
        
        this.initialized = false;
        console.log(`[${this.name}] Cleaned up successfully`);
    }

    /**
     * Get session information
     */
    getSessionInfo(sessionId: string): any {
        return {
            sessionId,
            agencyType: this.type,
            workflowStatus: this.getWorkflowStatus(),
            capabilities: this.getCapabilities(),
            initialized: this.initialized
        };
    }

    /**
     * Clear session data
     */
    async clearSession(sessionId: string): Promise<void> {
        // Clear session data from individual agents
        if (this.analyticalAgent && this.analyticalAgent.clearSession) {
            await this.analyticalAgent.clearSession(sessionId);
        }
        
        console.log(`[${this.name}] Cleared session: ${sessionId}`);
    }
}