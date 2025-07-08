/**
 * PostgresSessionStorage Class
 * 
 * PostgreSQL-based implementation of session storage.
 * Replaces JSONL file operations with database queries for better performance.
 */

import { Pool, PoolClient } from 'pg';
import { getPool } from '../database/pool';

export interface MessageMetadata {
    sessionId: string;
    sender: 'user' | 'bot' | 'system';
    agent?: string;
    timestamp?: string;
    userId?: string;
    userDatabaseId?: number;
    [key: string]: any;
}

export interface Message {
    id?: number;
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata: MessageMetadata;
}

export interface PostgresSessionStorageConfig {
    // Connection pool will be obtained from getPool()
    maxMessagesPerRead?: number;
}

export class PostgresSessionStorage {
    private pool: Pool;
    private config: PostgresSessionStorageConfig;
    
    constructor(config: PostgresSessionStorageConfig = {}) {
        this.pool = getPool();
        this.config = {
            maxMessagesPerRead: 1000,
            ...config
        };
    }
    
    /**
     * Append a message to the session
     * Uses database trigger to automatically update session activity
     */
    async appendMessage(sessionId: string, message: Message): Promise<void> {
        const query = `
            INSERT INTO chat_messages (session_id, type, content, created_at, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        
        try {
            const result = await this.pool.query(query, [
                sessionId,
                message.type,
                message.content,
                message.timestamp || new Date().toISOString(),
                JSON.stringify(message.metadata || {})
            ]);
            
            console.log(`[PostgresSessionStorage] Appended message to session ${sessionId}, id: ${result.rows[0].id}`);
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to append message to session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Batch append multiple messages (for better performance)
     */
    async appendMessages(sessionId: string, messages: Message[]): Promise<void> {
        if (messages.length === 0) return;
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Build multi-row insert
            const values: any[] = [];
            const placeholders: string[] = [];
            let paramIndex = 1;
            
            messages.forEach((message, index) => {
                const rowPlaceholders = [
                    `$${paramIndex++}`,  // session_id
                    `$${paramIndex++}`,  // type
                    `$${paramIndex++}`,  // content
                    `$${paramIndex++}`,  // created_at
                    `$${paramIndex++}`   // metadata
                ];
                placeholders.push(`(${rowPlaceholders.join(', ')})`);
                
                values.push(
                    sessionId,
                    message.type,
                    message.content,
                    message.timestamp || new Date().toISOString(),
                    JSON.stringify(message.metadata || {})
                );
            });
            
            const query = `
                INSERT INTO chat_messages (session_id, type, content, created_at, metadata)
                VALUES ${placeholders.join(', ')}
            `;
            
            await client.query(query, values);
            await client.query('COMMIT');
            
            console.log(`[PostgresSessionStorage] Appended ${messages.length} messages to session ${sessionId}`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[PostgresSessionStorage] Failed to append messages to session ${sessionId}:`, error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * Read messages from a session
     */
    async readMessages(
        sessionId: string, 
        options?: { 
            limit?: number; 
            offset?: number;
            reverse?: boolean;
        }
    ): Promise<Message[]> {
        const limit = options?.limit || this.config.maxMessagesPerRead!;
        const offset = options?.offset || 0;
        const order = options?.reverse ? 'ASC' : 'DESC';
        
        const query = `
            SELECT 
                id,
                type,
                content,
                created_at,
                metadata
            FROM chat_messages
            WHERE session_id = $1
            ORDER BY created_at ${order}, id ${order}
            LIMIT $2 OFFSET $3
        `;
        
        try {
            const result = await this.pool.query(query, [sessionId, limit, offset]);
            
            const messages: Message[] = result.rows.map(row => ({
                type: row.type,
                content: row.content,
                timestamp: row.created_at.toISOString(),
                metadata: row.metadata as MessageMetadata
            }));
            
            // If we fetched in DESC order but don't want reverse, flip the array
            if (!options?.reverse && order === 'DESC') {
                messages.reverse();
            }
            
            console.log(`[PostgresSessionStorage] Read ${messages.length} messages from session ${sessionId}`);
            return messages;
            
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to read messages from session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Read all messages from a session (for context loading)
     */
    async readAllMessages(sessionId: string): Promise<Message[]> {
        return this.readMessages(sessionId, { limit: Number.MAX_SAFE_INTEGER });
    }
    
    /**
     * Read last N messages from a session (optimized query)
     */
    async readLastMessages(sessionId: string, count: number): Promise<Message[]> {
        const query = `
            WITH last_messages AS (
                SELECT 
                    id,
                    type,
                    content,
                    created_at,
                    metadata
                FROM chat_messages
                WHERE session_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT $2
            )
            SELECT * FROM last_messages
            ORDER BY created_at ASC, id ASC
        `;
        
        try {
            const result = await this.pool.query(query, [sessionId, count]);
            
            const messages: Message[] = result.rows.map(row => ({
                type: row.type,
                content: row.content,
                timestamp: row.created_at.toISOString(),
                metadata: row.metadata as MessageMetadata
            }));
            
            return messages;
            
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to read last messages from session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Check if a session exists (fast query using sessions table)
     */
    async sessionExists(sessionId: string): Promise<boolean> {
        const query = 'SELECT 1 FROM chat_sessions WHERE id = $1 LIMIT 1';
        
        try {
            const result = await this.pool.query(query, [sessionId]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to check session existence for ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete all messages for a session (used for hard delete)
     * Note: With CASCADE, this happens automatically when session is deleted
     */
    async deleteSessionMessages(sessionId: string): Promise<void> {
        const query = 'DELETE FROM chat_messages WHERE session_id = $1';
        
        try {
            const result = await this.pool.query(query, [sessionId]);
            console.log(`[PostgresSessionStorage] Deleted ${result.rowCount} messages for session ${sessionId}`);
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to delete messages for session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get message count for a session (uses indexed count)
     */
    async getMessageCount(sessionId: string): Promise<number> {
        const query = 'SELECT message_count FROM chat_sessions WHERE id = $1';
        
        try {
            const result = await this.pool.query(query, [sessionId]);
            if (result.rowCount === 0) {
                return 0;
            }
            return result.rows[0].message_count;
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to get message count for session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Search messages across sessions (new capability!)
     */
    async searchMessages(
        userId: string,
        searchTerm: string,
        limit: number = 50
    ): Promise<Array<Message & { sessionId: string }>> {
        const query = `
            SELECT 
                m.session_id,
                m.type,
                m.content,
                m.created_at,
                m.metadata
            FROM chat_messages m
            INNER JOIN chat_sessions s ON m.session_id = s.id
            WHERE s.user_id = $1 
                AND s.status != 'deleted'
                AND m.content ILIKE $2
            ORDER BY m.created_at DESC
            LIMIT $3
        `;
        
        try {
            const result = await this.pool.query(query, [
                userId,
                `%${searchTerm}%`,
                limit
            ]);
            
            return result.rows.map(row => ({
                sessionId: row.session_id,
                type: row.type,
                content: row.content,
                timestamp: row.created_at.toISOString(),
                metadata: row.metadata as MessageMetadata
            }));
            
        } catch (error) {
            console.error(`[PostgresSessionStorage] Failed to search messages:`, error);
            throw error;
        }
    }
    
    /**
     * Get messages with pagination info
     */
    async getMessagesPage(
        sessionId: string,
        page: number = 1,
        pageSize: number = 50
    ): Promise<{
        messages: Message[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
    }> {
        const offset = (page - 1) * pageSize;
        
        // Get total count
        const countQuery = 'SELECT message_count FROM chat_sessions WHERE id = $1';
        const countResult = await this.pool.query(countQuery, [sessionId]);
        const totalCount = countResult.rows[0]?.message_count || 0;
        
        // Get messages
        const messages = await this.readMessages(sessionId, {
            limit: pageSize,
            offset: offset,
            reverse: false
        });
        
        return {
            messages,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            currentPage: page
        };
    }
    
    /**
     * No-op methods for compatibility (PostgreSQL handles these differently)
     */
    async closeAllStreams(): Promise<void> {
        // No streams to close with PostgreSQL
    }
    
    async flushSession(sessionId: string): Promise<void> {
        // PostgreSQL commits are handled by the connection pool
    }
}