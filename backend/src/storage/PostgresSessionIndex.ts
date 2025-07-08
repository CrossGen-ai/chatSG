/**
 * PostgresSessionIndex Class
 * 
 * PostgreSQL-based implementation of session indexing.
 * Replaces JSON file operations with database queries for instant updates and better performance.
 */

import { Pool } from 'pg';
import { getPool } from '../database/pool';
import { 
    SessionIndexEntry, 
    SessionStatus, 
    ListSessionsOptions,
    SessionIndexConfig 
} from './SessionIndex';

export interface PostgresSessionIndexConfig {
    // Connection pool will be obtained from getPool()
    // No file paths or backup needed
}

export class PostgresSessionIndex {
    private pool: Pool;
    
    constructor(config: PostgresSessionIndexConfig = {}) {
        this.pool = getPool();
    }
    
    /**
     * Initialize (no-op for PostgreSQL, but kept for interface compatibility)
     */
    async initialize(): Promise<void> {
        console.log('[PostgresSessionIndex] Initialized with PostgreSQL backend');
    }
    
    /**
     * Create a new session entry
     */
    async createSession(sessionId: string, title?: string, userId?: string): Promise<SessionIndexEntry> {
        const query = `
            INSERT INTO chat_sessions (id, user_id, title)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                last_activity_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        try {
            const result = await this.pool.query(query, [
                sessionId,
                userId ? parseInt(userId) : null,
                title || `Chat ${new Date().toLocaleDateString()}`
            ]);
            
            const row = result.rows[0];
            const entry = this.rowToSessionEntry(sessionId, row);
            
            console.log(`[PostgresSessionIndex] Created session ${sessionId}`);
            return entry;
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to create session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Update a session entry
     */
    async updateSession(sessionId: string, updates: Partial<SessionIndexEntry>): Promise<void> {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        // Build dynamic update query
        if (updates.title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            values.push(updates.title);
        }
        
        if (updates.status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        
        if (updates.metadata !== undefined) {
            updateFields.push(`metadata = metadata || $${paramIndex++}::jsonb`);
            values.push(JSON.stringify(updates.metadata));
        }
        
        if (updates.lastActivityAt !== undefined) {
            updateFields.push(`last_activity_at = $${paramIndex++}`);
            values.push(updates.lastActivityAt);
        } else {
            // Always update last activity
            updateFields.push(`last_activity_at = CURRENT_TIMESTAMP`);
        }
        
        if (updateFields.length === 0) return;
        
        values.push(sessionId); // Add session ID as last parameter
        
        const query = `
            UPDATE chat_sessions 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `;
        
        try {
            await this.pool.query(query, values);
            console.log(`[PostgresSessionIndex] Updated session ${sessionId}`);
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to update session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Update session status
     */
    async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
        await this.updateSession(sessionId, { status });
    }
    
    /**
     * Increment message count (handled by trigger, but kept for compatibility)
     */
    async incrementMessageCount(sessionId: string, count = 1): Promise<void> {
        // The database trigger handles this automatically
        // This method is kept for interface compatibility
        console.log(`[PostgresSessionIndex] Message count auto-incremented by trigger for session ${sessionId}`);
    }
    
    /**
     * Increment unread count for a session
     */
    async incrementUnreadCount(sessionId: string, count = 1): Promise<void> {
        const query = `
            UPDATE chat_sessions 
            SET unread_count = unread_count + $1
            WHERE id = $2
        `;
        
        try {
            await this.pool.query(query, [count, sessionId]);
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to increment unread count for session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Mark session as read (reset unread count)
     */
    async markSessionAsRead(sessionId: string): Promise<void> {
        const query = 'SELECT mark_session_read($1)';
        
        try {
            await this.pool.query(query, [sessionId]);
            console.log(`[PostgresSessionIndex] Marked session ${sessionId} as read`);
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to mark session ${sessionId} as read:`, error);
            throw error;
        }
    }
    
    /**
     * Get a session entry
     */
    async getSession(sessionId: string): Promise<SessionIndexEntry | undefined> {
        const query = 'SELECT * FROM chat_sessions WHERE id = $1';
        
        try {
            const result = await this.pool.query(query, [sessionId]);
            if (result.rowCount === 0) {
                return undefined;
            }
            
            return this.rowToSessionEntry(sessionId, result.rows[0]);
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to get session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get session synchronously (for compatibility - actually async)
     */
    getSessionSync(sessionId: string): SessionIndexEntry | undefined {
        console.warn('[PostgresSessionIndex] getSessionSync called - this is not truly synchronous with PostgreSQL');
        // Return undefined and log warning - caller should use async version
        return undefined;
    }
    
    /**
     * List sessions with filtering and sorting
     */
    async listSessions(options?: ListSessionsOptions): Promise<SessionIndexEntry[]> {
        const conditions: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        // Build WHERE clause
        if (options?.status) {
            const statusArray = Array.isArray(options.status) ? options.status : [options.status];
            const placeholders = statusArray.map(() => `$${paramIndex++}`);
            conditions.push(`status IN (${placeholders.join(', ')})`);
            values.push(...statusArray);
        }
        
        if (options?.userId) {
            conditions.push(`user_id = $${paramIndex++}`);
            values.push(parseInt(options.userId));
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Sorting
        const sortBy = options?.sortBy || 'last_activity_at';
        const sortOrder = options?.sortOrder || 'desc';
        const sortColumn = this.mapSortColumn(sortBy);
        
        // Pagination
        const limit = options?.limit || 1000;
        const offset = options?.offset || 0;
        
        const query = `
            SELECT *
            FROM chat_sessions_with_last_message
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        
        values.push(limit, offset);
        
        try {
            const result = await this.pool.query(query, values);
            
            return result.rows.map(row => ({
                ...this.rowToSessionEntry(row.id, row),
                sessionId: row.id // Include sessionId in result
            }));
        } catch (error) {
            console.error('[PostgresSessionIndex] Failed to list sessions:', error);
            throw error;
        }
    }
    
    /**
     * Get active session count
     */
    async getActiveSessionCount(): Promise<number> {
        const query = "SELECT COUNT(*) FROM chat_sessions WHERE status = 'active'";
        
        try {
            const result = await this.pool.query(query);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('[PostgresSessionIndex] Failed to get active session count:', error);
            throw error;
        }
    }
    
    /**
     * Check if a session exists
     */
    async sessionExists(sessionId: string): Promise<boolean> {
        const query = 'SELECT 1 FROM chat_sessions WHERE id = $1 LIMIT 1';
        
        try {
            const result = await this.pool.query(query, [sessionId]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to check session existence for ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Check if a session exists (sync version for compatibility)
     */
    sessionExistsSync(sessionId: string): boolean {
        console.warn('[PostgresSessionIndex] sessionExistsSync called - this is not truly synchronous with PostgreSQL');
        // Return false and log warning - caller should use async version
        return false;
    }
    
    /**
     * Delete a session from index (hard delete)
     */
    async deleteSession(sessionId: string): Promise<void> {
        const query = 'DELETE FROM chat_sessions WHERE id = $1';
        
        try {
            const result = await this.pool.query(query, [sessionId]);
            if ((result.rowCount || 0) > 0) {
                console.log(`[PostgresSessionIndex] Deleted session ${sessionId}`);
            }
        } catch (error) {
            console.error(`[PostgresSessionIndex] Failed to delete session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Soft delete a session (mark as deleted)
     */
    async softDeleteSession(sessionId: string): Promise<void> {
        await this.updateSessionStatus(sessionId, 'deleted');
    }
    
    /**
     * Force save any pending changes (no-op for PostgreSQL)
     */
    async flush(): Promise<void> {
        // PostgreSQL commits are handled automatically
    }
    
    /**
     * Get statistics about sessions
     */
    async getStatistics(): Promise<{
        total: number;
        active: number;
        inactive: number;
        archived: number;
        deleted: number;
    }> {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                COUNT(*) FILTER (WHERE status = 'archived') as archived,
                COUNT(*) FILTER (WHERE status = 'deleted') as deleted
            FROM chat_sessions
        `;
        
        try {
            const result = await this.pool.query(query);
            const row = result.rows[0];
            
            return {
                total: parseInt(row.total),
                active: parseInt(row.active),
                inactive: parseInt(row.inactive),
                archived: parseInt(row.archived),
                deleted: parseInt(row.deleted)
            };
        } catch (error) {
            console.error('[PostgresSessionIndex] Failed to get statistics:', error);
            throw error;
        }
    }
    
    /**
     * Convert database row to SessionIndexEntry
     */
    private rowToSessionEntry(sessionId: string, row: any): SessionIndexEntry {
        return {
            file: `session_${sessionId}.jsonl`, // For compatibility
            toolsFile: `session_${sessionId}_tools.jsonl`, // For compatibility
            status: row.status as SessionStatus,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            startedAt: row.started_at?.toISOString() || row.created_at?.toISOString() || new Date().toISOString(),
            lastActivityAt: row.last_activity_at?.toISOString() || row.created_at?.toISOString() || new Date().toISOString(),
            messageCount: row.message_count || 0,
            title: row.title,
            metadata: {
                ...row.metadata,
                userId: row.user_id?.toString(),
                unreadCount: row.unread_count || 0,
                lastReadAt: row.last_read_at?.toISOString() || null,
                // Add last message info if available
                lastMessageContent: row.last_message_content,
                lastMessageType: row.last_message_type,
                lastMessageTimestamp: row.last_message_timestamp?.toISOString() || null
            }
        };
    }
    
    /**
     * Map sort column names
     */
    private mapSortColumn(sortBy: string): string {
        const columnMap: Record<string, string> = {
            'createdAt': 'created_at',
            'lastActivityAt': 'last_activity_at',
            'title': 'title'
        };
        
        return columnMap[sortBy] || 'last_activity_at';
    }
}