/**
 * StorageManager Class
 * 
 * Unified interface for all storage operations.
 * Coordinates between SessionStorage, SessionIndex, and ToolLogger.
 */

import { Message } from './PostgresSessionStorage';
import { SessionIndexEntry, SessionStatus, ListSessionsOptions } from './PostgresSessionIndex';
import { ToolExecution } from './PostgresToolLogger';
import { PostgresSessionStorage } from './PostgresSessionStorage';
import { PostgresSessionIndex } from './PostgresSessionIndex';
import { PostgresToolLogger } from './PostgresToolLogger';
import { STORAGE_CONFIG } from '../config/storage.config';
import { getMem0Service, Mem0Service } from '../memory/Mem0Service';
import * as crypto from 'crypto';

export interface CreateSessionOptions {
    sessionId?: string;
    title?: string;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface SaveMessageOptions {
    sessionId: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
}

export interface GetMessagesOptions {
    limit?: number;
    offset?: number;
    reverse?: boolean;
    includeSystem?: boolean;
}

export interface SessionWithMessages extends SessionIndexEntry {
    sessionId: string;
    messages: Message[];
}

export class StorageManager {
    private sessionStorage: PostgresSessionStorage;
    private sessionIndex: PostgresSessionIndex;
    private toolLogger: PostgresToolLogger;
    private mem0Service: Mem0Service | null = null;
    private initialized = false;
    private sessionActivityTimers: Map<string, NodeJS.Timeout> = new Map();
    
    constructor() {
        console.log('[StorageManager] Initializing with PostgreSQL backend');
        
        this.sessionStorage = new PostgresSessionStorage({
            maxMessagesPerRead: STORAGE_CONFIG.maxMessagesPerRead
        });
        
        this.sessionIndex = new PostgresSessionIndex();
        
        this.toolLogger = new PostgresToolLogger({
            retentionDays: STORAGE_CONFIG.toolLogRetention
        });
        
        // Initialize Mem0 service if enabled
        if (STORAGE_CONFIG.mem0.enabled) {
            this.mem0Service = getMem0Service({
                embeddingModel: STORAGE_CONFIG.mem0.embeddingModel,
                llmModel: STORAGE_CONFIG.mem0.llmModel,
                historyDbPath: STORAGE_CONFIG.mem0.historyDbPath,
                collectionName: STORAGE_CONFIG.mem0.collectionName,
                dimension: STORAGE_CONFIG.mem0.dimension,
                provider: STORAGE_CONFIG.mem0.provider
            });
        }
    }
    
    /**
     * Initialize the storage manager
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        await this.sessionIndex.initialize();
        
        // Initialize Mem0 service if enabled
        if (this.mem0Service) {
            await this.mem0Service.initialize();
            console.log('[StorageManager] Mem0 service initialized');
        }
        
        this.initialized = true;
        
        // Start cleanup job for tool logs
        if (STORAGE_CONFIG.toolLogRetention > 0) {
            setInterval(async () => {
                try {
                    await this.toolLogger.cleanupOldLogs();
                } catch (error) {
                    console.error('[StorageManager] Tool log cleanup failed:', error);
                }
            }, 24 * 60 * 60 * 1000); // Run daily
        }
        
        console.log('[StorageManager] Initialized');
    }
    
    /**
     * Create a new chat session
     */
    async createSession(options: CreateSessionOptions = {}): Promise<SessionIndexEntry & { sessionId: string }> {
        const sessionId = options.sessionId || this.generateSessionId();
        const title = options.title || `Chat ${new Date().toLocaleDateString()}`;
        const userId = options.userId;
        
        // Create index entry
        const entry = await this.sessionIndex.createSession(sessionId, title, userId);
        
        // Add any additional metadata
        if (options.metadata) {
            await this.sessionIndex.updateSession(sessionId, {
                metadata: { ...entry.metadata, ...options.metadata }
            });
        }
        
        // Start activity timer
        this.startActivityTimer(sessionId);
        
        return { ...entry, sessionId };
    }
    
    /**
     * Save a message to a session
     */
    async saveMessage(options: SaveMessageOptions): Promise<void> {
        const { sessionId, type, content, metadata = {} } = options;
        
        // Ensure session exists
        const sessionExists = await this.sessionIndex.sessionExists(sessionId);
        if (!sessionExists) {
            await this.createSession({ sessionId });
        }
        
        // Create message
        const message: Message = {
            timestamp: new Date().toISOString(),
            type,
            content,
            metadata: {
                sessionId,
                sender: type === 'user' ? 'user' : type === 'assistant' ? 'bot' : 'system',
                ...metadata
            }
        };
        
        // Save to PostgreSQL
        await this.sessionStorage.appendMessage(sessionId, message);
        
        // Add to Mem0 if enabled
        if (this.mem0Service) {
            try {
                const session = await this.sessionIndex.getSession(sessionId);
                const userId = metadata.userId || session?.metadata?.userId || 'default';
                await this.mem0Service.addMessage(message, sessionId, userId);
            } catch (error) {
                console.error('[StorageManager] Failed to add message to Mem0:', error);
                // Continue without Mem0 - don't fail the entire operation
            }
        }
        
        // Update index
        await this.sessionIndex.incrementMessageCount(sessionId);
        
        // Update last agent if assistant message
        if (type === 'assistant' && metadata.agent) {
            const session = await this.sessionIndex.getSession(sessionId);
            await this.sessionIndex.updateSession(sessionId, {
                metadata: {
                    ...session?.metadata,
                    lastAgent: metadata.agent,
                    createdAt: session?.metadata?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    messageCount: session?.metadata?.messageCount || 0,
                    status: session?.metadata?.status || 'active'
                }
            });
        }
        
        // Reactivate session if it was inactive
        const session = await this.sessionIndex.getSession(sessionId);
        if (session && session.metadata?.status === 'inactive') {
            await this.updateSessionStatus(sessionId, 'active');
            console.log(`[StorageManager] Reactivated session ${sessionId} due to new message`);
        }
        
        // Reset activity timer
        this.resetActivityTimer(sessionId);
        
        console.log(`[StorageManager] Saved ${type} message to session ${sessionId}`);
    }
    
    /**
     * Save multiple messages (batch operation)
     */
    async saveMessages(sessionId: string, messages: Message[]): Promise<void> {
        // Ensure session exists
        const sessionExists = await this.sessionIndex.sessionExists(sessionId);
        if (!sessionExists) {
            await this.createSession({ sessionId });
        }
        
        // Append all messages
        for (const message of messages) {
            await this.sessionStorage.appendMessage(sessionId, message);
        }
        
        // Add to Mem0 if enabled
        if (this.mem0Service && messages.length > 0) {
            try {
                const session = await this.sessionIndex.getSession(sessionId);
                const userId = messages[0].metadata?.userId || 
                              session?.metadata?.userId || 
                              'default';
                
                // Extract user database ID if available
                const userDatabaseId = messages[0].metadata?.userDatabaseId ||
                                      session?.metadata?.userDatabaseId;
                
                await this.mem0Service.addMessages(messages, sessionId, userId, userDatabaseId);
            } catch (error) {
                console.error('[StorageManager] Failed to add messages to Mem0:', error);
                // Continue without Mem0 - don't fail the entire operation
            }
        }
        
        // Update index
        await this.sessionIndex.incrementMessageCount(sessionId, messages.length);
        
        // Update last agent from last assistant message
        const lastAssistantMessage = messages
            .filter(m => m.type === 'assistant' && m.metadata?.agent)
            .pop();
            
        if (lastAssistantMessage) {
            const session = await this.sessionIndex.getSession(sessionId);
            await this.sessionIndex.updateSession(sessionId, {
                metadata: {
                    ...session?.metadata,
                    lastAgent: lastAssistantMessage.metadata.agent,
                    createdAt: session?.metadata?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    messageCount: session?.metadata?.messageCount || 0,
                    status: session?.metadata?.status || 'active'
                }
            });
        }
        
        // Reset activity timer
        this.resetActivityTimer(sessionId);
        
        console.log(`[StorageManager] Saved ${messages.length} messages to session ${sessionId}`);
    }
    
    /**
     * Get messages from a session
     */
    async getMessages(sessionId: string, options?: GetMessagesOptions): Promise<Message[]> {
        const messages = await this.sessionStorage.readMessages(sessionId, {
            limit: options?.limit,
            offset: options?.offset,
            reverse: options?.reverse
        });
        
        // Filter out system messages if requested
        if (options?.includeSystem === false) {
            return messages.filter(m => m.type !== 'system');
        }
        
        return messages;
    }
    
    /**
     * Get messages for context (respects maxContextMessages config)
     */
    async getContextMessages(sessionId: string): Promise<Message[]> {
        // If Mem0 is not enabled, use the original implementation
        if (!this.mem0Service) {
            const messages = await this.sessionStorage.readLastMessages(
                sessionId,
                STORAGE_CONFIG.maxContextMessages
            );
            
            // Apply context configuration
            if (!STORAGE_CONFIG.context.includeSystemMessages) {
                return messages.filter(m => m.type !== 'system');
            }
            
            return messages;
        }
        
        // Use Mem0 for context retrieval - it handles intelligent compression
        try {
            const session = await this.sessionIndex.getSession(sessionId);
            const userId = session?.metadata?.userId || 'default';
            const memories = await this.mem0Service.getSessionMemories(
                sessionId, 
                userId,
                STORAGE_CONFIG.maxContextMessages
            );
            
            // For now, still return the actual messages from storage
            // In the future, we'll use Mem0's compressed memories
            const messages = await this.sessionStorage.readLastMessages(
                sessionId,
                STORAGE_CONFIG.maxContextMessages
            );
            
            // Apply context configuration
            if (!STORAGE_CONFIG.context.includeSystemMessages) {
                return messages.filter(m => m.type !== 'system');
            }
            
            return messages;
        } catch (error) {
            console.error('[StorageManager] Failed to get context from Mem0, falling back to storage:', error);
            // Fallback to regular storage
            const messages = await this.sessionStorage.readLastMessages(
                sessionId,
                STORAGE_CONFIG.maxContextMessages
            );
            
            if (!STORAGE_CONFIG.context.includeSystemMessages) {
                return messages.filter(m => m.type !== 'system');
            }
            
            return messages;
        }
    }
    
    /**
     * Get session info with messages
     */
    async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
        const session = await this.sessionIndex.getSession(sessionId);
        if (!session) {
            return null;
        }
        
        const messages = await this.sessionStorage.readAllMessages(sessionId);
        
        return {
            ...session,
            sessionId,
            messages
        };
    }
    
    /**
     * Check if a session exists
     */
    async sessionExists(sessionId: string): Promise<boolean> {
        return await this.sessionIndex.sessionExists(sessionId);
    }
    
    /**
     * List sessions
     */
    async listSessions(options?: ListSessionsOptions): Promise<(SessionIndexEntry & { sessionId: string })[]> {
        // Default to exclude deleted sessions unless explicitly requested
        if (!options?.status || (Array.isArray(options.status) && !options.status.includes('deleted'))) {
            const statusFilter: SessionStatus[] = options?.status 
                ? (Array.isArray(options.status) ? options.status : [options.status])
                : ['active', 'inactive', 'archived'] as SessionStatus[];
                
            return await this.sessionIndex.listSessions({
                ...options,
                status: statusFilter
            }) as (SessionIndexEntry & { sessionId: string })[];
        }
        
        return await this.sessionIndex.listSessions(options) as (SessionIndexEntry & { sessionId: string })[];
    }
    
    /**
     * Update session status
     */
    async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
        await this.sessionIndex.updateSessionStatus(sessionId, status);
        
        // Clear activity timer if marking as inactive/archived/deleted
        if (status !== 'active') {
            this.clearActivityTimer(sessionId);
        }
    }
    
    /**
     * Soft delete a session
     */
    async deleteSession(sessionId: string): Promise<void> {
        await this.sessionIndex.softDeleteSession(sessionId);
        this.clearActivityTimer(sessionId);
        
        console.log(`[StorageManager] Soft deleted session ${sessionId}`);
    }
    
    /**
     * Hard delete a session (permanent)
     */
    async hardDeleteSession(sessionId: string): Promise<void> {
        // Delete from index
        await this.sessionIndex.deleteSession(sessionId);
        
        // Delete session data (CASCADE will handle messages and tools)
        await this.sessionStorage.deleteSessionMessages(sessionId);
        
        // Delete from Mem0 if enabled
        if (this.mem0Service) {
            try {
                const session = await this.sessionIndex.getSession(sessionId);
                const userId = session?.metadata?.userId || 'default';
                const userDatabaseId = session?.metadata?.userDatabaseId;
                await this.mem0Service.deleteSessionMemories(sessionId, userId, userDatabaseId);
            } catch (error) {
                console.error('[StorageManager] Failed to delete session from Mem0:', error);
            }
        }
        
        // Clear timer
        this.clearActivityTimer(sessionId);
        
        console.log(`[StorageManager] Hard deleted session ${sessionId}`);
    }
    
    /**
     * Update session title
     */
    async updateSessionTitle(sessionId: string, title: string): Promise<void> {
        await this.sessionIndex.updateSession(sessionId, { title });
    }
    
    /**
     * Log tool execution
     */
    async logToolExecution(execution: ToolExecution): Promise<void> {
        await this.toolLogger.logToolExecution(execution.sessionId, execution);
    }
    
    /**
     * Track tool execution with automatic logging
     */
    async trackToolExecution<T>(
        sessionId: string,
        toolName: string,
        parameters: any,
        executor: () => Promise<T>,
        metadata?: any
    ): Promise<T> {
        return this.toolLogger.trackToolExecution(
            sessionId,
            toolName,
            parameters,
            executor,
            metadata
        );
    }
    
    /**
     * Get tool execution statistics
     */
    async getToolStats(sessionId: string) {
        return this.toolLogger.getToolStats(undefined, undefined);
    }
    
    /**
     * Get storage statistics
     */
    async getStatistics() {
        return {
            sessions: await this.sessionIndex.getStatistics(),
            activeStreams: this.sessionActivityTimers.size
        };
    }
    
    /**
     * Flush all pending writes
     */
    async flush(): Promise<void> {
        await this.sessionIndex.flush();
        // SessionStorage and ToolLogger handle their own flushing
    }
    
    /**
     * Get message count for a session
     */
    async getMessageCount(sessionId: string): Promise<number> {
        return await this.sessionStorage.getMessageCount(sessionId);
    }
    
    /**
     * Get cross-session context for a user
     * Retrieves messages from other active sessions to provide context
     */
    async getCrossSessionContext(
        currentSessionId: string, 
        userId: string | undefined,
        options?: {
            maxMessages?: number;
            maxSessions?: number;
        }
    ): Promise<{
        sessions: Array<{
            sessionId: string;
            title: string;
            lastActive: string;
            messages: Message[];
        }>;
        totalMessages: number;
    }> {
        const config = STORAGE_CONFIG.crossSession;
        const maxMessages = options?.maxMessages || config.maxCrossSessionMessages;
        const maxSessions = options?.maxSessions || config.maxActiveSessions;
        
        if (config.debug.logRetrievals) {
            console.log(`[StorageManager] Getting cross-session context for user ${userId}, current session: ${currentSessionId}`);
        }
        
        // Get all active sessions for the user
        const allSessions = await this.listSessions({
            status: 'active',
            userId: userId,
            sortBy: 'activity',
            sortOrder: 'desc'
        });
        
        console.log(`[StorageManager] Found ${allSessions.length} active sessions for user ${userId}`);
        allSessions.forEach(s => {
            console.log(`[StorageManager] - Session ${s.sessionId}: ${s.messageCount} messages, last active: ${s.lastActivityAt}`);
        });
        
        // Filter out current session and apply limits
        const otherSessions = allSessions
            .filter(session => session.sessionId !== currentSessionId)
            .filter(session => {
                const pass = (session.messageCount || 0) >= config.minMessagesThreshold;
                if (!pass) {
                    console.log(`[StorageManager] Session ${session.sessionId} filtered out: only ${session.messageCount || 0} messages (min: ${config.minMessagesThreshold})`);
                }
                return pass;
            })
            .filter(session => {
                // Check if session was active within the time window
                const lastActivity = new Date(session.lastActivityAt || new Date()).getTime();
                const cutoff = Date.now() - config.activeSessionWindow;
                const pass = lastActivity > cutoff;
                if (!pass) {
                    console.log(`[StorageManager] Session ${session.sessionId} filtered out: last active ${session.lastActivityAt || 'unknown'} is too old`);
                }
                return pass;
            })
            .slice(0, maxSessions);
        
        console.log(`[StorageManager] After filtering: ${otherSessions.length} sessions to retrieve context from`);
        
        const result: Array<{
            sessionId: string;
            title: string;
            lastActive: string;
            messages: Message[];
        }> = [];
        
        let totalMessages = 0;
        
        // Load messages from each session
        for (const session of otherSessions) {
            try {
                // Get recent messages from this session
                const messages = await this.getMessages(session.sessionId, {
                    limit: maxMessages,
                    reverse: true, // Get most recent messages
                    includeSystem: config.messageFiltering.includeSystemMessages
                });
                
                // Filter messages based on configuration
                const filteredMessages = messages.filter(msg => {
                    // Check message type
                    if (msg.type === 'user' && !config.messageFiltering.includeUserMessages) return false;
                    if (msg.type === 'assistant' && !config.messageFiltering.includeAssistantMessages) return false;
                    if (msg.type === 'system' && !config.messageFiltering.includeSystemMessages) return false;
                    
                    // Check exclude patterns
                    const content = msg.content.toLowerCase();
                    for (const pattern of config.messageFiltering.excludePatterns) {
                        if (pattern.test(content)) return false;
                    }
                    
                    return true;
                });
                
                if (filteredMessages.length > 0) {
                    result.push({
                        sessionId: session.sessionId,
                        title: session.title,
                        lastActive: session.lastActivityAt || session.metadata?.updatedAt || new Date().toISOString(),
                        messages: filteredMessages
                    });
                    totalMessages += filteredMessages.length;
                }
            } catch (error) {
                console.warn(`[StorageManager] Failed to load messages from session ${session.sessionId}:`, error);
            }
        }
        
        if (config.debug.logRetrievals) {
            console.log(`[StorageManager] Retrieved ${totalMessages} messages from ${result.length} cross-sessions`);
        }
        
        return { sessions: result, totalMessages };
    }
    
    /**
     * Get context for a specific query using Mem0's intelligent retrieval
     * This is the preferred method when using Mem0
     */
    async getContextForQuery(
        query: string,
        sessionId: string,
        systemPrompt?: string
    ): Promise<Array<{role: string, content: string}>> {
        if (!this.mem0Service) {
            // Fallback to traditional context building
            const messages = await this.getContextMessages(sessionId);
            const contextMessages: Array<{role: string, content: string}> = [];
            
            if (systemPrompt) {
                contextMessages.push({ role: 'system', content: systemPrompt });
            }
            
            messages.forEach(msg => {
                contextMessages.push({
                    role: msg.type === 'user' ? 'user' : 
                          msg.type === 'assistant' ? 'assistant' : 'system',
                    content: msg.content
                });
            });
            
            return contextMessages;
        }
        
        try {
            const session = await this.sessionIndex.getSession(sessionId);
            const userId = session?.metadata?.userId || 'default';
            const userDatabaseId = session?.metadata?.userDatabaseId;
            
            // Get context from Mem0 based on the query
            const contextMessages = await this.mem0Service.getContextForQuery(
                query,
                sessionId,
                userId,
                userDatabaseId,
                STORAGE_CONFIG.maxContextMessages
            );
            
            // Add system prompt if provided
            if (systemPrompt) {
                contextMessages.unshift({ role: 'system', content: systemPrompt });
            }
            
            return contextMessages;
        } catch (error) {
            console.error('[StorageManager] Failed to get context from Mem0:', error);
            // Fallback to traditional method
            return this.getContextForQuery(query, sessionId, systemPrompt);
        }
    }
    
    /**
     * Shutdown storage manager
     */
    async shutdown(): Promise<void> {
        // Clear all activity timers
        for (const timer of this.sessionActivityTimers.values()) {
            clearTimeout(timer);
        }
        this.sessionActivityTimers.clear();
        
        // PostgreSQL doesn't have streams to close, but keep for compatibility
        if ('closeAllStreams' in this.sessionStorage) {
            await (this.sessionStorage as any).closeAllStreams();
        }
        if ('closeAllStreams' in this.toolLogger) {
            await (this.toolLogger as any).closeAllStreams();
        }
        
        // Flush index
        await this.sessionIndex.flush();
        
        console.log('[StorageManager] Shutdown complete');
    }
    
    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        return crypto.randomBytes(16).toString('hex');
    }
    
    /**
     * Start activity timer for a session
     */
    private startActivityTimer(sessionId: string): void {
        if (!STORAGE_CONFIG.statusTransitions.activeToInactiveMs) {
            return;
        }
        
        this.clearActivityTimer(sessionId);
        
        const timer = setTimeout(() => {
            this.updateSessionStatus(sessionId, 'inactive').catch(error => {
                console.error(`[StorageManager] Failed to mark session ${sessionId} as inactive:`, error);
            });
        }, STORAGE_CONFIG.statusTransitions.activeToInactiveMs);
        
        this.sessionActivityTimers.set(sessionId, timer);
    }
    
    /**
     * Reset activity timer for a session
     */
    private resetActivityTimer(sessionId: string): void {
        this.sessionIndex.getSession(sessionId).then(session => {
            if (session && session.metadata?.status === 'active') {
                this.startActivityTimer(sessionId);
            }
        }).catch(error => {
            console.error(`[StorageManager] Failed to reset activity timer for session ${sessionId}:`, error);
        });
    }
    
    /**
     * Clear activity timer for a session
     */
    private clearActivityTimer(sessionId: string): void {
        const timer = this.sessionActivityTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.sessionActivityTimers.delete(sessionId);
        }
    }
}

// Singleton instance
let storageManager: StorageManager | null = null;

/**
 * Get or create the storage manager instance
 */
export function getStorageManager(): StorageManager {
    if (!storageManager) {
        storageManager = new StorageManager();
    }
    return storageManager;
}