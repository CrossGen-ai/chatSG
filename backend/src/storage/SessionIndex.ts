/**
 * SessionIndex Class
 * 
 * Manages the index.json file that provides fast lookups for all sessions.
 * Handles atomic updates and session metadata.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Mutex } from 'async-mutex';

export type SessionStatus = 'active' | 'inactive' | 'archived' | 'deleted';

export interface SessionIndexEntry {
    file: string;
    toolsFile: string;
    status: SessionStatus;
    createdAt: string;
    startedAt: string;
    lastActivityAt: string;
    messageCount: number;
    title: string;
    metadata: {
        lastAgent?: string;
        userId?: string;
        [key: string]: any;
    };
}

export interface SessionIndexConfig {
    basePath: string;
    indexFileName?: string;
    backupEnabled?: boolean;
}

export interface ListSessionsOptions {
    status?: SessionStatus | SessionStatus[];
    userId?: string;
    sortBy?: 'createdAt' | 'lastActivityAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export class SessionIndex {
    private config: SessionIndexConfig;
    private indexPath: string;
    private backupPath: string;
    private index: Map<string, SessionIndexEntry> = new Map();
    private mutex = new Mutex();
    private saveDebounceTimer?: NodeJS.Timeout;
    private pendingSave = false;
    
    constructor(config: SessionIndexConfig) {
        this.config = {
            indexFileName: 'index.json',
            backupEnabled: true,
            ...config
        };
        
        this.indexPath = path.join(this.config.basePath, this.config.indexFileName!);
        this.backupPath = path.join(this.config.basePath, `${this.config.indexFileName}.backup`);
    }
    
    /**
     * Initialize the index by loading from disk
     */
    async initialize(): Promise<void> {
        await this.mutex.runExclusive(async () => {
            try {
                await this.loadIndex();
                console.log(`[SessionIndex] Initialized with ${this.index.size} sessions`);
            } catch (error) {
                console.error('[SessionIndex] Failed to initialize:', error);
                throw error;
            }
        });
    }
    
    /**
     * Load index from disk
     */
    private async loadIndex(): Promise<void> {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            const indexData = JSON.parse(data);
            
            this.index.clear();
            for (const [sessionId, entry] of Object.entries(indexData)) {
                this.index.set(sessionId, entry as SessionIndexEntry);
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log('[SessionIndex] No existing index found, starting fresh');
                this.index.clear();
            } else {
                // Try backup if main index is corrupted
                if (this.config.backupEnabled) {
                    try {
                        console.log('[SessionIndex] Attempting to load from backup');
                        const backupData = await fs.readFile(this.backupPath, 'utf-8');
                        const indexData = JSON.parse(backupData);
                        
                        this.index.clear();
                        for (const [sessionId, entry] of Object.entries(indexData)) {
                            this.index.set(sessionId, entry as SessionIndexEntry);
                        }
                        
                        console.log('[SessionIndex] Successfully loaded from backup');
                    } catch (backupError) {
                        console.error('[SessionIndex] Failed to load backup:', backupError);
                        throw error; // Throw original error
                    }
                } else {
                    throw error;
                }
            }
        }
    }
    
    /**
     * Save index to disk (with debouncing)
     */
    private async saveIndex(immediate = false): Promise<void> {
        if (!immediate) {
            // Debounce saves to avoid excessive disk writes
            this.pendingSave = true;
            
            if (this.saveDebounceTimer) {
                clearTimeout(this.saveDebounceTimer);
            }
            
            this.saveDebounceTimer = setTimeout(() => {
                this.saveIndexImmediate();
            }, 100); // 100ms debounce
            
            return;
        }
        
        await this.saveIndexImmediate();
    }
    
    /**
     * Save index immediately
     */
    private async saveIndexImmediate(): Promise<void> {
        if (!this.pendingSave && !this.saveDebounceTimer) {
            return;
        }
        
        this.pendingSave = false;
        
        await this.mutex.runExclusive(async () => {
            try {
                // Convert Map to object
                const indexObject: Record<string, SessionIndexEntry> = {};
                for (const [sessionId, entry] of this.index.entries()) {
                    indexObject[sessionId] = entry;
                }
                
                const data = JSON.stringify(indexObject, null, 2);
                
                // Backup current index if enabled
                if (this.config.backupEnabled) {
                    try {
                        await fs.copyFile(this.indexPath, this.backupPath);
                    } catch (error: any) {
                        if (error.code !== 'ENOENT') {
                            console.warn('[SessionIndex] Failed to create backup:', error);
                        }
                    }
                }
                
                // Write new index
                await fs.writeFile(this.indexPath, data, 'utf-8');
                console.log('[SessionIndex] Saved index with', this.index.size, 'sessions');
                
            } catch (error) {
                console.error('[SessionIndex] Failed to save index:', error);
                throw error;
            }
        });
    }
    
    /**
     * Create a new session entry
     */
    async createSession(sessionId: string, title?: string, userId?: string): Promise<SessionIndexEntry> {
        const now = new Date().toISOString();
        
        const entry: SessionIndexEntry = {
            file: `session_${sessionId}.jsonl`,
            toolsFile: `session_${sessionId}_tools.jsonl`,
            status: 'active',
            createdAt: now,
            startedAt: now,
            lastActivityAt: now,
            messageCount: 0,
            title: title || `Chat ${new Date().toLocaleDateString()}`,
            metadata: {
                userId
            }
        };
        
        await this.mutex.runExclusive(async () => {
            this.index.set(sessionId, entry);
            await this.saveIndex();
        });
        
        console.log(`[SessionIndex] Created session ${sessionId}`);
        return entry;
    }
    
    /**
     * Update a session entry
     */
    async updateSession(sessionId: string, updates: Partial<SessionIndexEntry>): Promise<void> {
        await this.mutex.runExclusive(async () => {
            const entry = this.index.get(sessionId);
            if (!entry) {
                throw new Error(`Session not found: ${sessionId}`);
            }
            
            // Merge updates
            Object.assign(entry, updates);
            
            // Update lastActivityAt if not explicitly set
            if (!updates.lastActivityAt) {
                entry.lastActivityAt = new Date().toISOString();
            }
            
            await this.saveIndex();
        });
        
        console.log(`[SessionIndex] Updated session ${sessionId}`);
    }
    
    /**
     * Update session status
     */
    async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
        await this.updateSession(sessionId, { status });
    }
    
    /**
     * Increment message count
     */
    async incrementMessageCount(sessionId: string, count = 1): Promise<void> {
        await this.mutex.runExclusive(async () => {
            const entry = this.index.get(sessionId);
            if (!entry) {
                throw new Error(`Session not found: ${sessionId}`);
            }
            
            entry.messageCount += count;
            entry.lastActivityAt = new Date().toISOString();
            
            await this.saveIndex();
        });
    }
    
    /**
     * Get a session entry
     */
    getSession(sessionId: string): SessionIndexEntry | undefined {
        return this.index.get(sessionId);
    }
    
    /**
     * List sessions with filtering and sorting
     */
    listSessions(options?: ListSessionsOptions): SessionIndexEntry[] {
        let sessions = Array.from(this.index.entries());
        
        // Filter by status
        if (options?.status) {
            const statusFilter = Array.isArray(options.status) ? options.status : [options.status];
            sessions = sessions.filter(([_, entry]) => statusFilter.includes(entry.status));
        }
        
        // Filter by userId
        if (options?.userId) {
            sessions = sessions.filter(([_, entry]) => entry.metadata.userId === options.userId);
        }
        
        // Sort
        const sortBy = options?.sortBy || 'lastActivityAt';
        const sortOrder = options?.sortOrder || 'desc';
        
        sessions.sort(([_a, a], [_b, b]) => {
            let aValue: any = a[sortBy];
            let bValue: any = b[sortBy];
            
            if (sortBy === 'title') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Apply offset and limit
        const offset = options?.offset || 0;
        const limit = options?.limit || sessions.length;
        
        return sessions
            .slice(offset, offset + limit)
            .map(([sessionId, entry]) => ({
                ...entry,
                sessionId // Include sessionId in the result
            }));
    }
    
    /**
     * Get active session count
     */
    getActiveSessionCount(): number {
        return Array.from(this.index.values()).filter(entry => entry.status === 'active').length;
    }
    
    /**
     * Check if a session exists
     */
    sessionExists(sessionId: string): boolean {
        return this.index.has(sessionId);
    }
    
    /**
     * Delete a session from index (hard delete)
     */
    async deleteSession(sessionId: string): Promise<void> {
        await this.mutex.runExclusive(async () => {
            if (this.index.delete(sessionId)) {
                await this.saveIndex();
                console.log(`[SessionIndex] Deleted session ${sessionId}`);
            }
        });
    }
    
    /**
     * Soft delete a session (mark as deleted)
     */
    async softDeleteSession(sessionId: string): Promise<void> {
        await this.updateSessionStatus(sessionId, 'deleted');
    }
    
    /**
     * Force save any pending changes
     */
    async flush(): Promise<void> {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = undefined;
        }
        
        if (this.pendingSave) {
            await this.saveIndexImmediate();
        }
    }
    
    /**
     * Get statistics about sessions
     */
    getStatistics(): {
        total: number;
        active: number;
        inactive: number;
        archived: number;
        deleted: number;
    } {
        const stats = {
            total: this.index.size,
            active: 0,
            inactive: 0,
            archived: 0,
            deleted: 0
        };
        
        for (const entry of this.index.values()) {
            stats[entry.status]++;
        }
        
        return stats;
    }
}