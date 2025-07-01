/**
 * Generic Webhook Tool
 * 
 * A reusable webhook handler tool that can send requests to any webhook endpoint.
 * Designed for use with slash command webhook routing and n8n integrations.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../../../tools/Tool';
import axios, { AxiosResponse } from 'axios';

export class GenericWebhookTool extends BaseTool {
    private requestQueue: Map<string, Promise<any>> = new Map();

    constructor() {
        super(
            'generic-webhook',
            '1.0.0',
            'Generic webhook handler for routing requests to any webhook endpoint',
            { 
                enabled: true, 
                timeout: 30000, // 30 second timeout
                retries: 2,
                cacheResults: false, // Don't cache webhook results by default
                permissions: ['webhook-access', 'network-access']
            },
            {
                author: 'ChatSG Webhook System',
                category: 'webhook',
                tags: ['webhook', 'http', 'integration', 'n8n']
            }
        );
    }

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'path',
                    type: 'string',
                    description: 'Webhook URL endpoint to send the request to',
                    required: true,
                    pattern: '^https?://.+' // Basic URL validation
                },
                {
                    name: 'payload',
                    type: 'object',
                    description: 'Data payload to send to the webhook',
                    required: true,
                    properties: {
                        message: {
                            name: 'message',
                            type: 'string',
                            description: 'Main message content',
                            required: false
                        }
                    }
                },
                {
                    name: 'method',
                    type: 'string',
                    description: 'HTTP method to use',
                    required: false,
                    default: 'POST',
                    enum: ['POST', 'PUT', 'PATCH']
                },
                {
                    name: 'headers',
                    type: 'object',
                    description: 'Additional HTTP headers to include',
                    required: false,
                    default: {}
                },
                {
                    name: 'timeout',
                    type: 'number',
                    description: 'Request timeout in milliseconds',
                    required: false,
                    default: 30000,
                    minimum: 1000,
                    maximum: 120000
                }
            ],
            returns: {
                type: 'object',
                description: 'Webhook response with processed data',
                properties: {
                    output: 'string - processed response from webhook',
                    statusCode: 'number - HTTP status code',
                    responseTime: 'number - request duration in ms',
                    webhookUrl: 'string - the webhook endpoint called'
                }
            },
            examples: [
                {
                    input: {
                        path: 'http://localhost:5678/webhook/check-email',
                        payload: {
                            message: 'Please check my inbox',
                            originalMessage: '/check-email Please check my inbox'
                        }
                    },
                    output: {
                        output: 'Found 3 new emails in your inbox',
                        statusCode: 200,
                        responseTime: 1250,
                        webhookUrl: 'http://localhost:5678/webhook/check-email'
                    },
                    description: 'Send email check request to n8n webhook'
                }
            ]
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const { 
                path, 
                payload, 
                method = 'POST', 
                headers = {}, 
                timeout = this.config.timeout || 30000 
            } = params;

            // Validate required parameters
            if (!path || typeof path !== 'string') {
                return this.createErrorResult('Webhook path is required and must be a string');
            }

            if (!payload || typeof payload !== 'object') {
                return this.createErrorResult('Payload is required and must be an object');
            }

            // Validate URL format
            try {
                new URL(path);
            } catch {
                return this.createErrorResult(`Invalid webhook URL: ${path}`);
            }

            // Create request ID for deduplication (optional)
            const requestId = `${path}_${JSON.stringify(payload).substring(0, 100)}`;
            
            // Prepare request configuration
            const requestConfig = {
                method: method.toLowerCase(),
                url: path,
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'ChatSG-WebhookTool/1.0.0',
                    ...headers
                },
                timeout,
                validateStatus: (status: number) => status < 500 // Accept 4xx as valid responses
            };

            console.log(`[GenericWebhookTool] Sending ${method} request to: ${path}`);

            // Make the webhook request
            const response: AxiosResponse = await axios(requestConfig);
            const responseTime = Date.now() - startTime;

            // Extract output from response
            const output = this.extractOutput(response.data);

            const result = {
                output,
                statusCode: response.status,
                responseTime,
                webhookUrl: path,
                headers: response.headers,
                rawResponse: response.data
            };

            console.log(`[GenericWebhookTool] Webhook request completed in ${responseTime}ms (${response.status})`);

            return this.createSuccessResult(result, `Webhook request successful`, {
                executionTime: responseTime,
                webhookUrl: path,
                statusCode: response.status,
                sessionId: context?.sessionId,
                agentName: context?.agentName
            });

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            console.error(`[GenericWebhookTool] Webhook request failed:`, error.message);

            // Handle different types of errors
            let errorMessage = 'Webhook request failed';
            let statusCode = 0;

            if (error.response) {
                // Server responded with error status
                statusCode = error.response.status;
                errorMessage = `Webhook returned ${statusCode}: ${error.response.statusText}`;
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = `No response from webhook: ${error.message}`;
            } else {
                // Request setup error
                errorMessage = `Request setup error: ${error.message}`;
            }

            return this.createErrorResult(errorMessage, {
                executionTime,
                webhookUrl: params.path,
                statusCode,
                errorType: error.code || 'UNKNOWN',
                sessionId: context?.sessionId
            });
        }
    }

    /**
     * Extract meaningful output from webhook response
     */
    private extractOutput(responseData: any): string {
        if (!responseData) {
            return 'No output from webhook.';
        }

        // Try common output field names
        if (typeof responseData === 'string') {
            return responseData;
        }

        if (typeof responseData === 'object') {
            // Try common field names for output
            const outputFields = ['output', 'message', 'result', 'response', 'data', 'text'];
            
            for (const field of outputFields) {
                if (responseData[field] && typeof responseData[field] === 'string') {
                    return responseData[field];
                }
            }

            // If no standard field found, stringify the response
            try {
                return JSON.stringify(responseData, null, 2);
            } catch {
                return 'Webhook response received but could not be processed.';
            }
        }

        return String(responseData);
    }

    async cleanup(): Promise<void> {
        console.log('[GenericWebhookTool] Cleaning up webhook tool...');
        
        // Wait for any pending requests
        if (this.requestQueue.size > 0) {
            console.log(`[GenericWebhookTool] Waiting for ${this.requestQueue.size} pending requests...`);
            await Promise.allSettled(Array.from(this.requestQueue.values()));
        }
        
        this.requestQueue.clear();
        console.log('[GenericWebhookTool] Cleanup completed');
    }

    isReady(): boolean {
        return this.initialized;
    }

    getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string } {
        if (!this.initialized) {
            return { status: 'unhealthy', message: 'Not initialized' };
        }
        
        if (this.requestQueue.size > 20) {
            return { status: 'degraded', message: `High request queue: ${this.requestQueue.size} pending` };
        }
        
        return { status: 'healthy', message: 'Ready for webhook requests' };
    }
} 