/**
 * ToolLogger Class
 * 
 * Records all tool executions in a separate JSONL file.
 * Tracks both successful and failed tool calls for audit purposes.
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import * as readline from 'readline';

export interface ToolExecution {
    timestamp: string;
    sessionId: string;
    toolName: string;
    parameters: any;
    result?: any;
    success: boolean;
    executionTime: number;
    error?: string;
    metadata?: {
        agentName?: string;
        userId?: string;
        [key: string]: any;
    };
}

export interface ToolLoggerConfig {
    basePath: string;
    retentionDays?: number;
}

export interface ToolExecutionQuery {
    sessionId?: string;
    toolName?: string;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
}

export class ToolLogger {
    private config: ToolLoggerConfig;
    private writeStreams: Map<string, fs.WriteStream> = new Map();
    
    constructor(config: ToolLoggerConfig) {
        this.config = {
            retentionDays: 30,
            ...config
        };
        
        this.ensureDirectoryExists();
    }
    
    private async ensureDirectoryExists(): Promise<void> {
        try {
            await fsPromises.mkdir(this.config.basePath, { recursive: true });
        } catch (error) {
            console.error('[ToolLogger] Failed to create directory:', error);
            throw error;
        }
    }
    
    private getToolsFilePath(sessionId: string): string {
        return path.join(this.config.basePath, `session_${sessionId}_tools.jsonl`);
    }
    
    /**
     * Log a tool execution
     */
    async logToolExecution(execution: ToolExecution): Promise<void> {
        const filePath = this.getToolsFilePath(execution.sessionId);
        const line = JSON.stringify(execution) + '\n';
        
        try {
            // Get or create write stream for this session
            let stream = this.writeStreams.get(execution.sessionId);
            if (!stream || stream.destroyed) {
                stream = createWriteStream(filePath, { flags: 'a' });
                this.writeStreams.set(execution.sessionId, stream);
                
                // Handle stream errors
                stream.on('error', (error) => {
                    console.error(`[ToolLogger] Write stream error for session ${execution.sessionId}:`, error);
                    this.writeStreams.delete(execution.sessionId);
                });
            }
            
            // Write the execution log
            await new Promise<void>((resolve, reject) => {
                stream.write(line, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            console.log(`[ToolLogger] Logged ${execution.success ? 'successful' : 'failed'} execution of ${execution.toolName} for session ${execution.sessionId}`);
        } catch (error) {
            console.error(`[ToolLogger] Failed to log tool execution:`, error);
            throw error;
        }
    }
    
    /**
     * Helper method to log tool execution start and end
     */
    async trackToolExecution<T>(
        sessionId: string,
        toolName: string,
        parameters: any,
        executor: () => Promise<T>,
        metadata?: any
    ): Promise<T> {
        const startTime = Date.now();
        
        try {
            const result = await executor();
            
            await this.logToolExecution({
                timestamp: new Date().toISOString(),
                sessionId,
                toolName,
                parameters,
                result,
                success: true,
                executionTime: Date.now() - startTime,
                metadata
            });
            
            return result;
        } catch (error: any) {
            await this.logToolExecution({
                timestamp: new Date().toISOString(),
                sessionId,
                toolName,
                parameters,
                success: false,
                executionTime: Date.now() - startTime,
                error: error.message || String(error),
                metadata
            });
            
            throw error;
        }
    }
    
    /**
     * Query tool executions
     */
    async queryExecutions(query: ToolExecutionQuery): Promise<ToolExecution[]> {
        const executions: ToolExecution[] = [];
        
        // If querying specific session
        if (query.sessionId) {
            const filePath = this.getToolsFilePath(query.sessionId);
            await this.readExecutionsFromFile(filePath, executions, query);
        } else {
            // Query all sessions (expensive operation)
            const files = await fsPromises.readdir(this.config.basePath);
            const toolFiles = files.filter(f => f.endsWith('_tools.jsonl'));
            
            for (const file of toolFiles) {
                const filePath = path.join(this.config.basePath, file);
                await this.readExecutionsFromFile(filePath, executions, query);
                
                if (query.limit && executions.length >= query.limit) {
                    break;
                }
            }
        }
        
        // Sort by timestamp (newest first)
        executions.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Apply limit
        if (query.limit) {
            return executions.slice(0, query.limit);
        }
        
        return executions;
    }
    
    /**
     * Read executions from a specific file
     */
    private async readExecutionsFromFile(
        filePath: string,
        executions: ToolExecution[],
        query: ToolExecutionQuery
    ): Promise<void> {
        try {
            await fsPromises.access(filePath);
            
            const fileStream = createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            
            for await (const line of rl) {
                if (line.trim()) {
                    try {
                        const execution = JSON.parse(line) as ToolExecution;
                        
                        // Apply filters
                        if (query.toolName && execution.toolName !== query.toolName) continue;
                        if (query.success !== undefined && execution.success !== query.success) continue;
                        
                        const executionTime = new Date(execution.timestamp);
                        if (query.startTime && executionTime < query.startTime) continue;
                        if (query.endTime && executionTime > query.endTime) continue;
                        
                        executions.push(execution);
                        
                        if (query.limit && executions.length >= query.limit) {
                            break;
                        }
                    } catch (parseError) {
                        console.warn('[ToolLogger] Failed to parse execution log:', parseError);
                    }
                }
            }
            
            fileStream.close();
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('[ToolLogger] Error reading tool executions:', error);
            }
        }
    }
    
    /**
     * Get tool usage statistics for a session
     */
    async getSessionToolStats(sessionId: string): Promise<{
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageExecutionTime: number;
        toolUsage: Record<string, {
            count: number;
            successCount: number;
            averageTime: number;
        }>;
    }> {
        const executions = await this.queryExecutions({ sessionId });
        
        const stats = {
            totalExecutions: executions.length,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            toolUsage: {} as Record<string, {
                count: number;
                successCount: number;
                averageTime: number;
                totalTime: number;
            }>
        };
        
        let totalTime = 0;
        
        for (const execution of executions) {
            if (execution.success) {
                stats.successfulExecutions++;
            } else {
                stats.failedExecutions++;
            }
            
            totalTime += execution.executionTime;
            
            // Track per-tool stats
            if (!stats.toolUsage[execution.toolName]) {
                stats.toolUsage[execution.toolName] = {
                    count: 0,
                    successCount: 0,
                    averageTime: 0,
                    totalTime: 0
                };
            }
            
            const toolStats = stats.toolUsage[execution.toolName];
            toolStats.count++;
            toolStats.totalTime += execution.executionTime;
            if (execution.success) {
                toolStats.successCount++;
            }
        }
        
        // Calculate averages
        if (stats.totalExecutions > 0) {
            stats.averageExecutionTime = totalTime / stats.totalExecutions;
            
            for (const toolName of Object.keys(stats.toolUsage)) {
                const toolStats = stats.toolUsage[toolName];
                toolStats.averageTime = toolStats.totalTime / toolStats.count;
                // Remove totalTime from final result
                delete (toolStats as any).totalTime;
            }
        }
        
        return stats;
    }
    
    /**
     * Clean up old tool logs based on retention policy
     */
    async cleanupOldLogs(): Promise<number> {
        if (!this.config.retentionDays || this.config.retentionDays <= 0) {
            return 0;
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
        
        let deletedCount = 0;
        
        try {
            const files = await fsPromises.readdir(this.config.basePath);
            const toolFiles = files.filter(f => f.endsWith('_tools.jsonl'));
            
            for (const file of toolFiles) {
                const filePath = path.join(this.config.basePath, file);
                const stats = await fsPromises.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fsPromises.unlink(filePath);
                    deletedCount++;
                    console.log(`[ToolLogger] Deleted old tool log: ${file}`);
                }
            }
            
            if (deletedCount > 0) {
                console.log(`[ToolLogger] Cleaned up ${deletedCount} old tool log files`);
            }
            
        } catch (error) {
            console.error('[ToolLogger] Error during cleanup:', error);
        }
        
        return deletedCount;
    }
    
    /**
     * Close all write streams
     */
    async closeAllStreams(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (const [sessionId, stream] of this.writeStreams.entries()) {
            if (!stream.destroyed) {
                promises.push(new Promise((resolve) => {
                    stream.end(() => {
                        console.log(`[ToolLogger] Closed stream for session ${sessionId}`);
                        resolve();
                    });
                }));
            }
        }
        
        await Promise.all(promises);
        this.writeStreams.clear();
    }
    
    /**
     * Delete tool logs for a session
     */
    async deleteSessionLogs(sessionId: string): Promise<void> {
        // Close stream if open
        const stream = this.writeStreams.get(sessionId);
        if (stream) {
            stream.end();
            this.writeStreams.delete(sessionId);
        }
        
        // Delete file
        const filePath = this.getToolsFilePath(sessionId);
        try {
            await fsPromises.unlink(filePath);
            console.log(`[ToolLogger] Deleted tool logs for session ${sessionId}`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error(`[ToolLogger] Failed to delete tool logs for session ${sessionId}:`, error);
            }
        }
    }
}