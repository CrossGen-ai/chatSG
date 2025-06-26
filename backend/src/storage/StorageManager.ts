/**
 * StorageManager Class
 * 
 * Unified interface for all storage operations.
 * Coordinates between SessionStorage, SessionIndex, and ToolLogger.
 */

import { SessionStorage, Message } from './SessionStorage';
import { SessionIndex, SessionIndexEntry, SessionStatus, ListSessionsOptions } from './SessionIndex';
import { ToolLogger, ToolExecution } from './ToolLogger';
import { STORAGE_CONFIG } from '../config/storage.config';
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
    private sessionStorage: SessionStorage;
    private sessionIndex: SessionIndex;
    private toolLogger: ToolLogger;
    private initialized = false;
    private sessionActivityTimers: Map<string, NodeJS.Timeout> = new Map();
    
    constructor() {
        this.sessionStorage = new SessionStorage({
            basePath: STORAGE_CONFIG.sessionPath,
            maxMessagesPerRead: STORAGE_CONFIG.maxMessagesPerRead
        });
        
        this.sessionIndex = new SessionIndex({
            basePath: STORAGE_CONFIG.sessionPath,
            backupEnabled: STORAGE_CONFIG.enableIndexBackup
        });
        
        this.toolLogger = new ToolLogger({
            basePath: STORAGE_CONFIG.sessionPath,
            retentionDays: STORAGE_CONFIG.toolLogRetention
        });
    }
    
    /**
     * Initialize the storage manager
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        await this.sessionIndex.initialize();
        this.initialized = true;
        
        // Start cleanup job for tool logs
        if (STORAGE_CONFIG.toolLogRetention > 0) {
            setInterval(() => {
                this.toolLogger.cleanupOldLogs().catch(error => {
                    console.error('[StorageManager] Tool log cleanup failed:', error);
                });
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
        if (!this.sessionIndex.sessionExists(sessionId)) {
            await this.createSession({ sessionId });
        }
        
        // Create message
        const message: Message = {
            timestamp: new Date().toISOString(),
            type,
            content,
            metadata: {
                sessionId,
                ...metadata
            }
        };
        
        // Append to JSONL file
        await this.sessionStorage.appendMessage(sessionId, message);
        
        // Update index
        await this.sessionIndex.incrementMessageCount(sessionId);
        
        // Update last agent if assistant message
        if (type === 'assistant' && metadata.agent) {
            await this.sessionIndex.updateSession(sessionId, {
                metadata: {
                    ...this.sessionIndex.getSession(sessionId)?.metadata,
                    lastAgent: metadata.agent
                }
            });
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
        if (!this.sessionIndex.sessionExists(sessionId)) {
            await this.createSession({ sessionId });
        }
        
        // Append all messages
        for (const message of messages) {
            await this.sessionStorage.appendMessage(sessionId, message);
        }
        
        // Update index
        await this.sessionIndex.incrementMessageCount(sessionId, messages.length);
        
        // Update last agent from last assistant message
        const lastAssistantMessage = messages
            .filter(m => m.type === 'assistant' && m.metadata?.agent)
            .pop();
            
        if (lastAssistantMessage) {
            await this.sessionIndex.updateSession(sessionId, {
                metadata: {
                    ...this.sessionIndex.getSession(sessionId)?.metadata,
                    lastAgent: lastAssistantMessage.metadata.agent
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
    
    /**
     * Get session info with messages
     */
    async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
        const session = this.sessionIndex.getSession(sessionId);
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
    sessionExists(sessionId: string): boolean {
        return this.sessionIndex.sessionExists(sessionId);
    }
    
    /**
     * List sessions
     */
    listSessions(options?: ListSessionsOptions): SessionIndexEntry[] {
        // Default to exclude deleted sessions unless explicitly requested
        if (!options?.status || (Array.isArray(options.status) && !options.status.includes('deleted'))) {
            const statusFilter: SessionStatus[] = options?.status 
                ? (Array.isArray(options.status) ? options.status : [options.status])
                : ['active', 'inactive', 'archived'] as SessionStatus[];
                
            return this.sessionIndex.listSessions({
                ...options,
                status: statusFilter
            });
        }
        
        return this.sessionIndex.listSessions(options);
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
        
        // Delete files
        await this.sessionStorage.deleteSession(sessionId);
        await this.toolLogger.deleteSessionLogs(sessionId);
        
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
        await this.toolLogger.logToolExecution(execution);
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
        return this.toolLogger.getSessionToolStats(sessionId);
    }
    
    /**
     * Get storage statistics
     */
    getStatistics() {
        return {
            sessions: this.sessionIndex.getStatistics(),
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
        return this.sessionStorage.getMessageCount(sessionId);
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
        
        // Close all streams
        await this.sessionStorage.closeAllStreams();
        await this.toolLogger.closeAllStreams();
        
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
        const session = this.sessionIndex.getSession(sessionId);
        if (session && session.status === 'active') {
            this.startActivityTimer(sessionId);
        }
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