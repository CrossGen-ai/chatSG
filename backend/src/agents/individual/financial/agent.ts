import { AbstractBaseAgent } from '../../core/BaseAgent';
import { AgentResponse, AgentCapabilities, ValidationResult, StreamingCallback } from '../../../types';

declare const require: any;

export class FinancialAgent extends AbstractBaseAgent {
    private initialized: boolean = false;
    private llmHelper: any;
    private llm: any;

    constructor() {
        super(
            'FinancialAgent',
            '1.0.0',
            'Specialized agent for financial analysis, investment research, and economic insights',
            'financial'
        );
        try {
            const { getLLMHelper } = require('../../../../../utils/llm-helper');
            this.llmHelper = getLLMHelper();
            this.llm = this.llmHelper.createChatLLM();
        } catch (error) {
            console.warn(`[${this.name}] LLM helper not available:`, error);
            this.llmHelper = null;
            this.llm = null;
        }
    }

    async initialize(configOverride?: any): Promise<void> {
        try {
            console.log(`[${this.name}] Initializing financial agent...`);
            if (this.llmHelper) {
                const validation = this.llmHelper.validateConfiguration();
                if (!validation.valid) {
                    throw new Error(`LLM configuration invalid: ${validation.errors.join(', ')}`);
                }
            }
            this.initialized = true;
            console.log(`[${this.name}] Financial agent initialized successfully`);
        } catch (error) {
            console.error(`[${this.name}] Initialization failed:`, error);
            throw error;
        }
    }

    async processMessage(input: string, sessionId: string, streamCallback?: StreamingCallback): Promise<AgentResponse> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            if (!this.llmHelper || !this.llm) {
                console.warn(`[${this.name}] LLM not available, providing fallback response`);
                return {
                    success: true,
                    message: "I'm a financial agent, but my advanced LLM capabilities are currently unavailable. I can still help with basic financial questions. Please describe your financial inquiry.",
                    sessionId,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        agentName: this.name,
                        agentType: this.type,
                        llmUsed: false,
                        fallbackMode: true,
                        memoryStatus: this.getMemoryStatus()
                    }
                };
            }
            const systemPrompt = this.getSystemPrompt();
            const messages = await this.buildContextMessages(sessionId, input, systemPrompt);
            if (streamCallback) {
                let fullResponse = '';
                const streamingLLM = this.llmHelper.createChatLLM({
                    streaming: true,
                    callbacks: [{
                        handleLLMNewToken: (token: string) => {
                            fullResponse += token;
                            streamCallback(token);
                        },
                        handleLLMEnd: () => {},
                        handleLLMError: (error: Error) => {
                            console.error(`[${this.name}] Streaming error:`, error);
                        }
                    }]
                });
                const response = await streamingLLM.invoke(messages);
                return {
                    success: true,
                    message: fullResponse || response.content || response,
                    sessionId,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        agentName: this.name,
                        agentType: this.type,
                        llmUsed: true,
                        streaming: true,
                        responseLength: fullResponse.length || (response.content || response).length,
                        memoryStatus: this.getMemoryStatus()
                    }
                };
            } else {
                const response = await this.llm.invoke(messages);
                const responseContent = response.content || response;
                return {
                    success: true,
                    message: responseContent,
                    sessionId,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        agentName: this.name,
                        agentType: this.type,
                        llmUsed: true,
                        responseLength: responseContent.length,
                        memoryStatus: this.getMemoryStatus()
                    }
                };
            }
        } catch (error) {
            console.error(`[${this.name}] Error processing message:`, error);
            return {
                success: false,
                message: `I encountered an error while processing your financial request: ${(error as Error).message}`,
                sessionId,
                timestamp: new Date().toISOString(),
                metadata: { 
                    error: true, 
                    agentName: this.name,
                    agentType: this.type,
                    memoryStatus: this.getMemoryStatus()
                }
            };
        }
    }

    private getSystemPrompt(): string {
        return `You are an expert financial analyst AI. Your role is to provide clear, accurate, and actionable financial analysis, investment research, and economic insights. Always:
- Use up-to-date financial reasoning and best practices
- Explain your logic and cite relevant financial principles
- Avoid giving direct investment advice, but provide frameworks for decision-making
- Answer questions about stocks, bonds, markets, macroeconomics, company analysis, risk, and portfolio theory
- If you do not know the answer, say so honestly
- Format answers for clarity, using bullet points, tables, or step-by-step reasoning when helpful

EXAMPLES OF QUESTIONS YOU CAN HANDLE:
- "What are the key financial ratios to analyze a company?"
- "How do interest rate changes affect bond prices?"
- "What are the main risks in a diversified portfolio?"
- "Explain the difference between value and growth investing."
- "How can I interpret a company's cash flow statement?"
- "What macroeconomic indicators should investors watch?"

You are rigorous, unbiased, and always strive to educate the user about financial concepts.`;
    }

    getCapabilities(): AgentCapabilities {
        return {
            name: this.name,
            version: this.version,
            supportedModes: ['financial_analysis', 'investment_research', 'economic_insights'],
            features: [
                'financial_analysis',
                'investment_research',
                'macroeconomic_insights',
                'company_analysis',
                'risk_assessment',
                'portfolio_theory',
                'llm_integration'
            ],
            inputTypes: ['text', 'financial_questions', 'company_data'],
            outputTypes: ['financial_reports', 'explanations', 'insights'],
            maxSessionMemory: 1000,
            supportsTools: false,
            supportsStateSharing: true
        };
    }

    validateConfig(): ValidationResult {
        return { valid: true, errors: [] };
    }
} 