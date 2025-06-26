/**
 * ContextManager Class
 * 
 * Manages context loading and formatting for LLM interactions.
 * Handles context window limits and overflow strategies.
 */

import { Message } from './SessionStorage';
import { STORAGE_CONFIG } from '../config/storage.config';

export interface ContextMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
    metadata?: Record<string, any>;
}

export interface ContextOptions {
    includeSystemMessages?: boolean;
    maxMessages?: number;
    systemPrompt?: string;
    overflowStrategy?: 'sliding-window' | 'summarize' | 'truncate';
}

export interface ContextResult {
    messages: ContextMessage[];
    totalMessages: number;
    truncated: boolean;
    strategy: string;
}

export class ContextManager {
    /**
     * Format messages for LLM context
     */
    static formatMessagesForContext(
        messages: Message[],
        options: ContextOptions = {}
    ): ContextResult {
        const config = {
            includeSystemMessages: options.includeSystemMessages ?? STORAGE_CONFIG.context.includeSystemMessages,
            maxMessages: options.maxMessages ?? STORAGE_CONFIG.maxContextMessages,
            overflowStrategy: options.overflowStrategy ?? STORAGE_CONFIG.context.overflowStrategy
        };
        
        // Filter messages if needed
        let filteredMessages = messages;
        if (!config.includeSystemMessages) {
            filteredMessages = messages.filter(m => m.type !== 'system');
        }
        
        // Convert to context format
        let contextMessages: ContextMessage[] = filteredMessages.map(msg => ({
            role: msg.type === 'user' ? 'user' : msg.type === 'assistant' ? 'assistant' : 'system',
            content: msg.content,
            metadata: msg.metadata
        }));
        
        // Add system prompt if provided
        if (options.systemPrompt) {
            contextMessages.unshift({
                role: 'system',
                content: options.systemPrompt
            });
        }
        
        // Handle context overflow
        const result: ContextResult = {
            messages: contextMessages,
            totalMessages: contextMessages.length,
            truncated: false,
            strategy: 'none'
        };
        
        if (contextMessages.length > config.maxMessages) {
            switch (config.overflowStrategy) {
                case 'sliding-window':
                    result.messages = this.applySlidingWindow(contextMessages, config.maxMessages);
                    result.truncated = true;
                    result.strategy = 'sliding-window';
                    break;
                    
                case 'summarize':
                    // For now, fall back to sliding window
                    // TODO: Implement summarization
                    result.messages = this.applySlidingWindow(contextMessages, config.maxMessages);
                    result.truncated = true;
                    result.strategy = 'sliding-window-fallback';
                    break;
                    
                case 'truncate':
                    result.messages = contextMessages.slice(-config.maxMessages);
                    result.truncated = true;
                    result.strategy = 'truncate';
                    break;
            }
        }
        
        return result;
    }
    
    /**
     * Apply sliding window strategy
     */
    private static applySlidingWindow(
        messages: ContextMessage[],
        maxMessages: number
    ): ContextMessage[] {
        // Reserve space for system messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');
        
        const systemReserve = Math.min(
            systemMessages.length,
            STORAGE_CONFIG.context.systemPromptReserve
        );
        
        const conversationLimit = maxMessages - systemReserve;
        
        // Keep most recent system messages
        const keptSystemMessages = systemMessages.slice(-systemReserve);
        
        // Keep most recent conversation messages
        const keptConversationMessages = conversationMessages.slice(-conversationLimit);
        
        // Combine, keeping system messages at the beginning
        return [...keptSystemMessages, ...keptConversationMessages];
    }
    
    /**
     * Calculate token estimate for messages
     * This is a rough estimate - actual token count depends on the model
     */
    static estimateTokenCount(messages: ContextMessage[]): number {
        let totalTokens = 0;
        
        for (const message of messages) {
            // Rough estimation: 1 token ≈ 4 characters
            totalTokens += Math.ceil(message.content.length / 4);
            
            // Add overhead for message structure
            totalTokens += 4; // role tokens
            
            // Add metadata if present
            if (message.metadata) {
                totalTokens += Math.ceil(JSON.stringify(message.metadata).length / 4);
            }
        }
        
        return totalTokens;
    }
    
    /**
     * Build context from message history with smart truncation
     */
    static buildContext(
        messages: Message[],
        currentUserMessage: string,
        options: ContextOptions = {}
    ): ContextResult {
        // Format existing messages
        const formattedResult = this.formatMessagesForContext(messages, options);
        
        // Add current user message
        formattedResult.messages.push({
            role: 'user',
            content: currentUserMessage
        });
        
        // Re-check limits with the new message
        if (formattedResult.messages.length > (options.maxMessages ?? STORAGE_CONFIG.maxContextMessages)) {
            // Remove oldest non-system message
            const firstNonSystemIndex = formattedResult.messages.findIndex(m => m.role !== 'system');
            if (firstNonSystemIndex >= 0) {
                formattedResult.messages.splice(firstNonSystemIndex, 1);
                formattedResult.truncated = true;
            }
        }
        
        return formattedResult;
    }
    
    /**
     * Extract tool usage from messages
     */
    static extractToolUsage(messages: Message[]): string[] {
        const toolsUsed: Set<string> = new Set();
        
        for (const message of messages) {
            if (message.metadata?.toolsUsed && Array.isArray(message.metadata.toolsUsed)) {
                for (const tool of message.metadata.toolsUsed) {
                    toolsUsed.add(tool);
                }
            }
        }
        
        return Array.from(toolsUsed);
    }
    
    /**
     * Get conversation summary (for future summarization feature)
     */
    static getConversationSummary(messages: Message[]): {
        messageCount: number;
        userMessageCount: number;
        assistantMessageCount: number;
        firstMessageTime: string | null;
        lastMessageTime: string | null;
        agents: string[];
        topics: string[]; // Placeholder for topic extraction
    } {
        const summary = {
            messageCount: messages.length,
            userMessageCount: 0,
            assistantMessageCount: 0,
            firstMessageTime: null as string | null,
            lastMessageTime: null as string | null,
            agents: new Set<string>(),
            topics: [] as string[]
        };
        
        for (const message of messages) {
            if (message.type === 'user') {
                summary.userMessageCount++;
            } else if (message.type === 'assistant') {
                summary.assistantMessageCount++;
                
                if (message.metadata?.agent) {
                    summary.agents.add(message.metadata.agent);
                }
            }
            
            if (!summary.firstMessageTime) {
                summary.firstMessageTime = message.timestamp;
            }
            summary.lastMessageTime = message.timestamp;
        }
        
        return {
            ...summary,
            agents: Array.from(summary.agents)
        };
    }
    
    /**
     * Format context for specific LLM providers
     */
    static formatForProvider(
        context: ContextMessage[],
        provider: 'openai' | 'anthropic' | 'azure'
    ): any {
        switch (provider) {
            case 'openai':
            case 'azure':
                // OpenAI format
                return context.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    ...(msg.name && { name: msg.name })
                }));
                
            case 'anthropic':
                // Claude format - combine system messages
                const systemContent = context
                    .filter(m => m.role === 'system')
                    .map(m => m.content)
                    .join('\n\n');
                    
                const messages = context
                    .filter(m => m.role !== 'system')
                    .map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }));
                    
                return {
                    system: systemContent,
                    messages
                };
                
            default:
                return context;
        }
    }
}