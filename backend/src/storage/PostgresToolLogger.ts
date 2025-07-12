/**
 * PostgresToolLogger Class
 * 
 * PostgreSQL-based implementation of tool execution logging.
 * Provides structured storage and querying capabilities for tool usage.
 */

import { Pool } from 'pg';
import { getPool } from '../database/pool';
import { performance } from 'perf_hooks';

export interface ToolExecution {
    id?: string;
    sessionId: string;
    toolName: string;
    timestamp: string;
    parameters: any;
    result?: any;
    error?: any;
    success: boolean;
    executionTime: number;
    agentName: string;
    userId?: string;
    userDatabaseId?: number;
    metadata?: any; // For backward compatibility
}

export interface ToolExecutionQuery {
    sessionId?: string;
    toolName?: string;
    agentName?: string;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
}

export interface PostgresToolLoggerConfig {
    // Connection pool will be obtained from getPool()
    retentionDays?: number;
}

export class PostgresToolLogger {
    // Don't cache the pool - get it fresh for each operation
    private config: PostgresToolLoggerConfig;
    
    constructor(config: PostgresToolLoggerConfig = {}) {
        // Pool will be obtained via getPool() when needed
        this.config = {
            retentionDays: 30,
            ...config
        };
    }
    
    /**
     * Log a tool execution
     */
    async logToolExecution(
        sessionId: string,
        execution: ToolExecution,
        messageId?: number
    ): Promise<void> {
        const query = `
            INSERT INTO chat_tool_executions (
                session_id, 
                message_id,
                tool_name, 
                tool_input, 
                tool_output,
                status,
                started_at,
                completed_at,
                error_message,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `;
        
        try {
            const result = await getPool().query(query, [
                sessionId,
                messageId || null,
                execution.toolName,
                JSON.stringify(execution.parameters),
                execution.result ? JSON.stringify(execution.result) : null,
                execution.success ? 'success' : 'error',
                execution.timestamp,
                new Date(new Date(execution.timestamp).getTime() + execution.executionTime).toISOString(),
                execution.error || null,
                JSON.stringify(execution.metadata || {})
            ]);
            
            console.log(`[PostgresToolLogger] Logged tool execution for ${execution.toolName} in session ${sessionId}, id: ${result.rows[0].id}`);
        } catch (error) {
            console.error(`[PostgresToolLogger] Failed to log tool execution:`, error);
            throw error;
        }
    }
    
    /**
     * Update tool execution status
     */
    async updateToolExecution(
        executionId: number,
        updates: {
            status?: string;
            output?: any;
            error?: string;
            completedAt?: string;
        }
    ): Promise<void> {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (updates.status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        
        if (updates.output !== undefined) {
            updateFields.push(`tool_output = $${paramIndex++}`);
            values.push(JSON.stringify(updates.output));
        }
        
        if (updates.error !== undefined) {
            updateFields.push(`error_message = $${paramIndex++}`);
            values.push(updates.error);
        }
        
        if (updates.completedAt !== undefined) {
            updateFields.push(`completed_at = $${paramIndex++}`);
            values.push(updates.completedAt);
        }
        
        if (updateFields.length === 0) return;
        
        values.push(executionId);
        
        const query = `
            UPDATE chat_tool_executions 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `;
        
        try {
            await getPool().query(query, values);
        } catch (error) {
            console.error(`[PostgresToolLogger] Failed to update tool execution ${executionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Read tool executions for a session
     */
    async readToolExecutions(
        sessionId: string,
        options?: {
            limit?: number;
            toolName?: string;
            status?: string;
        }
    ): Promise<ToolExecution[]> {
        const conditions = ['session_id = $1'];
        const values: any[] = [sessionId];
        let paramIndex = 2;
        
        if (options?.toolName) {
            conditions.push(`tool_name = $${paramIndex++}`);
            values.push(options.toolName);
        }
        
        if (options?.status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(options.status);
        }
        
        const limit = options?.limit || 100;
        values.push(limit);
        
        const query = `
            SELECT 
                id,
                tool_name,
                tool_input,
                tool_output,
                status,
                started_at,
                completed_at,
                duration_ms,
                error_message,
                metadata
            FROM chat_tool_executions
            WHERE ${conditions.join(' AND ')}
            ORDER BY started_at DESC
            LIMIT $${paramIndex}
        `;
        
        try {
            const result = await getPool().query(query, values);
            
            return result.rows.map(row => ({
                sessionId: sessionId,
                toolName: row.tool_name,
                parameters: row.tool_input,
                result: row.tool_output,
                success: row.status === 'success',
                timestamp: row.started_at.toISOString(),
                executionTime: row.duration_ms || 0,
                error: row.error_message,
                agentName: row.metadata?.agentName || 'unknown',
                metadata: row.metadata
            }));
        } catch (error) {
            console.error(`[PostgresToolLogger] Failed to read tool executions:`, error);
            throw error;
        }
    }
    
    /**
     * Get tool usage statistics
     */
    async getToolStats(
        userId?: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        toolName: string;
        count: number;
        avgDuration: number;
        successRate: number;
    }[]> {
        const conditions: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (userId) {
            conditions.push(`s.user_id = $${paramIndex++}`);
            values.push(parseInt(userId));
        }
        
        if (dateRange) {
            conditions.push(`t.started_at >= $${paramIndex++}`);
            conditions.push(`t.started_at <= $${paramIndex++}`);
            values.push(dateRange.start, dateRange.end);
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const query = `
            SELECT 
                t.tool_name,
                COUNT(*) as count,
                AVG(t.duration_ms) as avg_duration,
                COUNT(*) FILTER (WHERE t.status = 'success') * 100.0 / COUNT(*) as success_rate
            FROM chat_tool_executions t
            ${userId ? 'INNER JOIN chat_sessions s ON t.session_id = s.id' : ''}
            ${whereClause}
            GROUP BY t.tool_name
            ORDER BY count DESC
        `;
        
        try {
            const result = await getPool().query(query, values);
            
            return result.rows.map(row => ({
                toolName: row.tool_name,
                count: parseInt(row.count),
                avgDuration: parseFloat(row.avg_duration) || 0,
                successRate: parseFloat(row.success_rate) || 0
            }));
        } catch (error) {
            console.error('[PostgresToolLogger] Failed to get tool stats:', error);
            throw error;
        }
    }
    
    /**
     * Clean up old tool logs
     */
    async cleanupOldLogs(): Promise<number> {
        if (this.config.retentionDays === 0) {
            return 0; // No cleanup if retention is disabled
        }
        
        const query = `
            DELETE FROM chat_tool_executions
            WHERE started_at < CURRENT_TIMESTAMP - INTERVAL '${this.config.retentionDays} days'
        `;
        
        try {
            const result = await getPool().query(query);
            const deletedCount = result.rowCount || 0;
            
            if (deletedCount > 0) {
                console.log(`[PostgresToolLogger] Cleaned up ${deletedCount} old tool executions`);
            }
            
            return deletedCount;
        } catch (error) {
            console.error('[PostgresToolLogger] Failed to cleanup old logs:', error);
            throw error;
        }
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
        const startTime = performance.now();
        const timestamp = new Date().toISOString();
        
        try {
            const result = await executor();
            const executionTime = performance.now() - startTime;
            
            await this.logToolExecution(sessionId, {
                timestamp,
                sessionId,
                toolName,
                parameters,
                result,
                success: true,
                executionTime,
                agentName: metadata?.agentName || 'unknown',
                metadata
            });
            
            return result;
        } catch (error) {
            const executionTime = performance.now() - startTime;
            
            await this.logToolExecution(sessionId, {
                timestamp,
                sessionId,
                toolName,
                parameters,
                success: false,
                executionTime,
                error: error instanceof Error ? error.message : String(error),
                agentName: metadata?.agentName || 'unknown',
                metadata
            });
            
            throw error;
        }
    }
    
    /**
     * Get recent tool executions across all sessions
     */
    async getRecentExecutions(limit: number = 50): Promise<Array<ToolExecution & { sessionId: string }>> {
        const query = `
            SELECT 
                t.session_id,
                t.tool_name,
                t.tool_input,
                t.tool_output,
                t.status,
                t.started_at,
                t.completed_at,
                t.duration_ms,
                t.error_message,
                t.metadata,
                s.title as session_title
            FROM chat_tool_executions t
            INNER JOIN chat_sessions s ON t.session_id = s.id
            ORDER BY t.started_at DESC
            LIMIT $1
        `;
        
        try {
            const result = await getPool().query(query, [limit]);
            
            return result.rows.map(row => ({
                sessionId: row.session_id,
                toolName: row.tool_name,
                parameters: row.tool_input,
                result: row.tool_output,
                success: row.status === 'success',
                timestamp: row.started_at.toISOString(),
                executionTime: row.duration_ms || 0,
                error: row.error_message,
                agentName: row.metadata?.agentName || 'unknown',
                metadata: {
                    ...row.metadata,
                    sessionTitle: row.session_title
                }
            }));
        } catch (error) {
            console.error('[PostgresToolLogger] Failed to get recent executions:', error);
            throw error;
        }
    }
}