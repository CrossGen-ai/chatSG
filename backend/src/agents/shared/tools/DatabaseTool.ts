/**
 * Shared Database Tool
 * 
 * A database tool with connection pooling and resource management.
 * Shared across all agents to optimize database connections.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../../../tools/Tool';

interface ConnectionPool {
    connections: any[];
    maxConnections: number;
    activeConnections: number;
    totalQueries: number;
}

export class DatabaseTool extends BaseTool {
    private connectionPool: ConnectionPool;
    private queryQueue: Array<{ query: string; resolve: Function; reject: Function }> = [];

    constructor() {
        super(
            'database',
            '1.0.0',
            'Shared database tool with connection pooling and query optimization',
            { 
                enabled: true, 
                timeout: 10000,
                retries: 1,
                cacheResults: true,
                cacheTTL: 60000, // 1 minute cache for queries
                permissions: ['database-access']
            },
            {
                author: 'ChatSG Shared Tool System',
                category: 'database',
                tags: ['database', 'sql', 'shared', 'pooling']
            }
        );

        this.connectionPool = {
            connections: [],
            maxConnections: 5,
            activeConnections: 0,
            totalQueries: 0
        };
    }

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'operation',
                    type: 'string',
                    description: 'Database operation to perform',
                    required: true,
                    enum: ['query', 'execute', 'transaction', 'stats']
                },
                {
                    name: 'sql',
                    type: 'string',
                    description: 'SQL query or statement',
                    required: false
                },
                {
                    name: 'params',
                    type: 'array',
                    description: 'Query parameters',
                    required: false
                }
            ],
            returns: {
                type: 'object',
                description: 'Database operation results'
            },
            examples: [
                {
                    input: {
                        operation: 'query',
                        sql: 'SELECT * FROM users WHERE id = ?',
                        params: [1]
                    },
                    output: {
                        success: true,
                        data: [{ id: 1, name: 'John Doe' }],
                        rowCount: 1
                    },
                    description: 'Execute a SELECT query'
                }
            ]
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const { operation, sql, params: queryParams = [] } = params;

            let result: any;

            switch (operation) {
                case 'query':
                    if (!sql) {
                        return this.createErrorResult('SQL query is required');
                    }
                    result = await this.executeQuery(sql, queryParams, context);
                    break;

                case 'execute':
                    if (!sql) {
                        return this.createErrorResult('SQL statement is required');
                    }
                    result = await this.executeStatement(sql, queryParams, context);
                    break;

                case 'stats':
                    result = this.getConnectionStats();
                    break;

                case 'transaction':
                    return this.createErrorResult('Transactions not implemented in mock version');

                default:
                    return this.createErrorResult(`Unknown operation: ${operation}`);
            }

            const executionTime = Date.now() - startTime;

            return this.createSuccessResult(result, `Database operation completed: ${operation}`, {
                executionTime,
                operation,
                agentId: context?.agentName,
                sessionId: context?.sessionId,
                poolStats: this.getConnectionStats()
            });

        } catch (error) {
            return this.createErrorResult(`Database operation failed: ${(error as Error).message}`);
        }
    }

    private async executeQuery(sql: string, params: any[], context?: ToolContext): Promise<any> {
        console.log(`[DatabaseTool] Executing query: ${sql.substring(0, 100)}...`);
        
        // Simulate database query with connection pooling
        const connection = await this.getConnection();
        
        try {
            this.connectionPool.totalQueries++;
            
            // Simulate query execution
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            // Mock results based on query type
            const mockResult = this.generateMockResult(sql, params);
            
            return {
                success: true,
                data: mockResult.rows,
                rowCount: mockResult.rowCount,
                query: sql,
                params,
                connectionId: connection.id,
                metadata: {
                    agentId: context?.agentName,
                    sessionId: context?.sessionId,
                    queryType: this.detectQueryType(sql)
                }
            };
            
        } finally {
            this.releaseConnection(connection);
        }
    }

    private async executeStatement(sql: string, params: any[], context?: ToolContext): Promise<any> {
        console.log(`[DatabaseTool] Executing statement: ${sql.substring(0, 100)}...`);
        
        const connection = await this.getConnection();
        
        try {
            this.connectionPool.totalQueries++;
            
            // Simulate statement execution
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 30));
            
            const affectedRows = Math.floor(Math.random() * 5) + 1;
            
            return {
                success: true,
                affectedRows,
                statement: sql,
                params,
                connectionId: connection.id,
                metadata: {
                    agentId: context?.agentName,
                    sessionId: context?.sessionId,
                    statementType: this.detectQueryType(sql)
                }
            };
            
        } finally {
            this.releaseConnection(connection);
        }
    }

    private async getConnection(): Promise<any> {
        // Simulate connection pool management
        if (this.connectionPool.activeConnections < this.connectionPool.maxConnections) {
            const connection = {
                id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                created: new Date(),
                lastUsed: new Date()
            };
            
            this.connectionPool.activeConnections++;
            console.log(`[DatabaseTool] Acquired connection: ${connection.id} (${this.connectionPool.activeConnections}/${this.connectionPool.maxConnections})`);
            
            return connection;
        } else {
            // Wait for available connection
            console.log('[DatabaseTool] Waiting for available connection...');
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.getConnection();
        }
    }

    private releaseConnection(connection: any): void {
        this.connectionPool.activeConnections--;
        console.log(`[DatabaseTool] Released connection: ${connection.id} (${this.connectionPool.activeConnections}/${this.connectionPool.maxConnections})`);
    }

    private generateMockResult(sql: string, params: any[]): { rows: any[], rowCount: number } {
        const queryType = this.detectQueryType(sql);
        
        switch (queryType) {
            case 'SELECT':
                const rowCount = Math.floor(Math.random() * 10) + 1;
                const rows = Array.from({ length: rowCount }, (_, i) => ({
                    id: i + 1,
                    name: `Record ${i + 1}`,
                    value: Math.random() * 100,
                    created_at: new Date().toISOString()
                }));
                return { rows, rowCount };
                
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
                return { rows: [], rowCount: Math.floor(Math.random() * 5) + 1 };
                
            default:
                return { rows: [], rowCount: 0 };
        }
    }

    private detectQueryType(sql: string): string {
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('SELECT')) return 'SELECT';
        if (trimmed.startsWith('INSERT')) return 'INSERT';
        if (trimmed.startsWith('UPDATE')) return 'UPDATE';
        if (trimmed.startsWith('DELETE')) return 'DELETE';
        if (trimmed.startsWith('CREATE')) return 'CREATE';
        if (trimmed.startsWith('DROP')) return 'DROP';
        if (trimmed.startsWith('ALTER')) return 'ALTER';
        return 'UNKNOWN';
    }

    private getConnectionStats(): any {
        const availableConnections = this.connectionPool.maxConnections - this.connectionPool.activeConnections;
        return {
            ...this.connectionPool,
            availableConnections,
            utilizationRate: (this.connectionPool.activeConnections / this.connectionPool.maxConnections) * 100,
            averageQueriesPerConnection: this.connectionPool.activeConnections > 0 
                ? this.connectionPool.totalQueries / this.connectionPool.activeConnections 
                : 0
        };
    }

    async cleanup(): Promise<void> {
        console.log('[DatabaseTool] Cleaning up database connections...');
        
        // Wait for active connections to finish
        while (this.connectionPool.activeConnections > 0) {
            console.log(`[DatabaseTool] Waiting for ${this.connectionPool.activeConnections} active connections...`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Clear connection pool
        this.connectionPool.connections = [];
        this.connectionPool.totalQueries = 0;
        
        console.log('[DatabaseTool] Database cleanup completed');
    }

    getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string } {
        const utilizationRate = (this.connectionPool.activeConnections / this.connectionPool.maxConnections) * 100;
        
        if (utilizationRate > 90) {
            return { 
                status: 'degraded', 
                message: `High connection utilization: ${utilizationRate.toFixed(1)}%` 
            };
        }
        
        if (this.connectionPool.activeConnections === this.connectionPool.maxConnections) {
            return { 
                status: 'degraded', 
                message: 'All connections in use' 
            };
        }
        
        const availableConnections = this.connectionPool.maxConnections - this.connectionPool.activeConnections;
        return { 
            status: 'healthy', 
            message: `${availableConnections} connections available` 
        };
    }
} 