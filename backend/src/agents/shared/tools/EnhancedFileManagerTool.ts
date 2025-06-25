/**
 * Enhanced Shared File Manager Tool
 * 
 * An advanced file management tool with system resource management,
 * connection pooling, and enhanced security. Shared across all agents.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../../../tools/Tool';
import * as path from 'path';
import * as fs from 'fs/promises';

interface FileOperationResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata: {
        operation: string;
        path: string;
        timestamp: string;
        size?: number;
        permissions?: string;
    };
}

export class EnhancedFileManagerTool extends BaseTool {
    private resourcePool: Map<string, any> = new Map();
    private operationQueue: Promise<any>[] = [];
    private maxConcurrentOps: number = 5;
    private allowedPaths: Set<string> = new Set();

    constructor() {
        super(
            'enhanced-file-manager',
            '1.0.0',
            'Enhanced file manager with system resource management and security',
            { 
                enabled: true, 
                timeout: 30000,
                retries: 1,
                cacheResults: false, // File operations shouldn't be cached
                permissions: ['file-read', 'file-write', 'system-access']
            },
            {
                author: 'ChatSG Shared Tool System',
                category: 'file',
                tags: ['file', 'system', 'security', 'shared', 'advanced']
            }
        );

        // Initialize allowed paths (in real implementation, this would be configurable)
        this.allowedPaths.add(process.cwd());
        this.allowedPaths.add(path.join(process.cwd(), 'src'));
        this.allowedPaths.add(path.join(process.cwd(), 'backend'));
        this.allowedPaths.add(path.join(process.cwd(), 'frontend'));
    }

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'operation',
                    type: 'string',
                    description: 'File operation to perform',
                    required: true,
                    enum: [
                        'read-file',
                        'write-file', 
                        'file-stats',
                        'list-directory',
                        'create-directory',
                        'file-exists',
                        'get-file-info',
                        'search-files'
                    ]
                },
                {
                    name: 'path',
                    type: 'string',
                    description: 'File or directory path (relative to project root)',
                    required: true
                },
                {
                    name: 'content',
                    type: 'string',
                    description: 'Content for write operations',
                    required: false
                },
                {
                    name: 'options',
                    type: 'object',
                    description: 'Additional options for the operation',
                    required: false,
                    properties: {
                        encoding: {
                            name: 'encoding',
                            type: 'string',
                            description: 'File encoding',
                            required: false,
                            default: 'utf8',
                            enum: ['utf8', 'ascii', 'base64']
                        },
                        recursive: {
                            name: 'recursive',
                            type: 'boolean',
                            description: 'Recursive operation for directories',
                            required: false,
                            default: false
                        },
                        pattern: {
                            name: 'pattern',
                            type: 'string',
                            description: 'Search pattern for file search',
                            required: false
                        }
                    }
                }
            ],
            returns: {
                type: 'object',
                description: 'File operation results with metadata',
                properties: {
                    success: 'boolean',
                    data: 'any - operation-specific data',
                    error: 'string - error message if failed',
                    metadata: 'object with operation metadata'
                }
            },
            examples: [
                {
                    input: {
                        operation: 'read-file',
                        path: 'package.json'
                    },
                    output: {
                        success: true,
                        data: '{ "name": "example" }',
                        metadata: {
                            operation: 'read-file',
                            path: 'package.json',
                            size: 25
                        }
                    },
                    description: 'Read a file from the project'
                }
            ]
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const { operation, path: filePath, content, options = {} } = params;

            if (!filePath || typeof filePath !== 'string') {
                return this.createErrorResult('Path is required and must be a string');
            }

            // Security check: validate path
            const safePath = this.validateAndNormalizePath(filePath);
            if (!safePath) {
                return this.createErrorResult(`Access denied: Path '${filePath}' is not allowed`);
            }

            // Queue management: limit concurrent operations
            if (this.operationQueue.length >= this.maxConcurrentOps) {
                await Promise.race(this.operationQueue);
                this.operationQueue = this.operationQueue.filter(p => p !== undefined);
            }

            let operationPromise: Promise<FileOperationResult>;

            switch (operation) {
                case 'read-file':
                    operationPromise = this.readFile(safePath, options);
                    break;

                case 'write-file':
                    if (!content) {
                        return this.createErrorResult('Content is required for write operations');
                    }
                    operationPromise = this.writeFile(safePath, content, options);
                    break;

                case 'file-stats':
                    operationPromise = this.getFileStats(safePath);
                    break;

                case 'list-directory':
                    operationPromise = this.listDirectory(safePath, options);
                    break;

                case 'create-directory':
                    operationPromise = this.createDirectory(safePath, options);
                    break;

                case 'file-exists':
                    operationPromise = this.fileExists(safePath);
                    break;

                case 'get-file-info':
                    operationPromise = this.getFileInfo(safePath);
                    break;

                case 'search-files':
                    operationPromise = this.searchFiles(safePath, options);
                    break;

                default:
                    return this.createErrorResult(`Unknown operation: ${operation}`);
            }

            // Add to operation queue
            this.operationQueue.push(operationPromise);

            const result = await operationPromise;
            const executionTime = Date.now() - startTime;

            // Remove from queue when done
            this.operationQueue = this.operationQueue.filter(p => p !== operationPromise);

            if (result.success) {
                return this.createSuccessResult(result, `File operation completed: ${operation}`, {
                    executionTime,
                    operation,
                    agentId: context?.agentName,
                    sessionId: context?.sessionId
                });
            } else {
                return this.createErrorResult(result.error || 'Operation failed');
            }

        } catch (error) {
            return this.createErrorResult(`File operation failed: ${(error as Error).message}`);
        }
    }

    private validateAndNormalizePath(filePath: string): string | null {
        try {
            // Normalize and resolve the path
            const normalizedPath = path.normalize(filePath);
            const resolvedPath = path.resolve(normalizedPath);
            
            // Check if the resolved path is within allowed directories
            const isAllowed = Array.from(this.allowedPaths).some(allowedPath => {
                const resolved = path.resolve(allowedPath);
                return resolvedPath.startsWith(resolved);
            });

            if (!isAllowed) {
                console.warn(`[EnhancedFileManagerTool] Access denied to path: ${resolvedPath}`);
                return null;
            }

            return resolvedPath;

        } catch (error) {
            console.error(`[EnhancedFileManagerTool] Path validation error:`, error);
            return null;
        }
    }

    private async readFile(filePath: string, options: any): Promise<FileOperationResult> {
        try {
            const encoding = options.encoding || 'utf8';
            const content = await fs.readFile(filePath, encoding);
            const stats = await fs.stat(filePath);

            return {
                success: true,
                data: content,
                metadata: {
                    operation: 'read-file',
                    path: filePath,
                    timestamp: new Date().toISOString(),
                    size: stats.size
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to read file: ${(error as Error).message}`,
                metadata: {
                    operation: 'read-file',
                    path: filePath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async writeFile(filePath: string, content: string, options: any): Promise<FileOperationResult> {
        try {
            const encoding = options.encoding || 'utf8';
            await fs.writeFile(filePath, content, encoding);
            const stats = await fs.stat(filePath);

            return {
                success: true,
                data: { bytesWritten: Buffer.byteLength(content, encoding) },
                metadata: {
                    operation: 'write-file',
                    path: filePath,
                    timestamp: new Date().toISOString(),
                    size: stats.size
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to write file: ${(error as Error).message}`,
                metadata: {
                    operation: 'write-file',
                    path: filePath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async getFileStats(filePath: string): Promise<FileOperationResult> {
        try {
            const stats = await fs.stat(filePath);

            return {
                success: true,
                data: {
                    size: stats.size,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    created: stats.birthtime,
                    modified: stats.mtime,
                    accessed: stats.atime,
                    mode: stats.mode,
                    permissions: (stats.mode & parseInt('777', 8)).toString(8)
                },
                metadata: {
                    operation: 'file-stats',
                    path: filePath,
                    timestamp: new Date().toISOString(),
                    size: stats.size,
                    permissions: (stats.mode & parseInt('777', 8)).toString(8)
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to get file stats: ${(error as Error).message}`,
                metadata: {
                    operation: 'file-stats',
                    path: filePath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async listDirectory(dirPath: string, options: any): Promise<FileOperationResult> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const items = entries.map(entry => ({
                name: entry.name,
                type: entry.isFile() ? 'file' : entry.isDirectory() ? 'directory' : 'other',
                path: path.join(dirPath, entry.name)
            }));

            return {
                success: true,
                data: {
                    items,
                    count: items.length,
                    files: items.filter(item => item.type === 'file').length,
                    directories: items.filter(item => item.type === 'directory').length
                },
                metadata: {
                    operation: 'list-directory',
                    path: dirPath,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to list directory: ${(error as Error).message}`,
                metadata: {
                    operation: 'list-directory',
                    path: dirPath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async createDirectory(dirPath: string, options: any): Promise<FileOperationResult> {
        try {
            const recursive = options.recursive || false;
            await fs.mkdir(dirPath, { recursive });

            return {
                success: true,
                data: { created: true },
                metadata: {
                    operation: 'create-directory',
                    path: dirPath,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to create directory: ${(error as Error).message}`,
                metadata: {
                    operation: 'create-directory',
                    path: dirPath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async fileExists(filePath: string): Promise<FileOperationResult> {
        try {
            await fs.access(filePath);
            const stats = await fs.stat(filePath);

            return {
                success: true,
                data: {
                    exists: true,
                    type: stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other'
                },
                metadata: {
                    operation: 'file-exists',
                    path: filePath,
                    timestamp: new Date().toISOString(),
                    size: stats.size
                }
            };

        } catch (error) {
            return {
                success: true,
                data: { exists: false },
                metadata: {
                    operation: 'file-exists',
                    path: filePath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async getFileInfo(filePath: string): Promise<FileOperationResult> {
        try {
            const info = {
                basename: path.basename(filePath),
                dirname: path.dirname(filePath),
                extension: path.extname(filePath),
                name: path.parse(filePath).name,
                isAbsolute: path.isAbsolute(filePath),
                normalized: path.normalize(filePath)
            };

            return {
                success: true,
                data: info,
                metadata: {
                    operation: 'get-file-info',
                    path: filePath,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to get file info: ${(error as Error).message}`,
                metadata: {
                    operation: 'get-file-info',
                    path: filePath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async searchFiles(searchPath: string, options: any): Promise<FileOperationResult> {
        try {
            const pattern = options.pattern || '*';
            const recursive = options.recursive || false;
            
            // Simple pattern matching implementation
            const results: string[] = [];
            await this.walkDirectory(searchPath, pattern, recursive, results);

            return {
                success: true,
                data: {
                    matches: results,
                    count: results.length,
                    pattern,
                    searchPath
                },
                metadata: {
                    operation: 'search-files',
                    path: searchPath,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to search files: ${(error as Error).message}`,
                metadata: {
                    operation: 'search-files',
                    path: searchPath,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    private async walkDirectory(dirPath: string, pattern: string, recursive: boolean, results: string[]): Promise<void> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isFile()) {
                    // Simple pattern matching (could be enhanced with glob patterns)
                    if (pattern === '*' || entry.name.includes(pattern)) {
                        results.push(fullPath);
                    }
                } else if (entry.isDirectory() && recursive) {
                    await this.walkDirectory(fullPath, pattern, recursive, results);
                }
            }
        } catch (error) {
            // Continue walking even if one directory fails
            console.warn(`[EnhancedFileManagerTool] Failed to walk directory ${dirPath}:`, error);
        }
    }

    async cleanup(): Promise<void> {
        console.log('[EnhancedFileManagerTool] Cleaning up...');
        
        // Wait for pending operations
        if (this.operationQueue.length > 0) {
            console.log(`[EnhancedFileManagerTool] Waiting for ${this.operationQueue.length} pending operations...`);
            await Promise.allSettled(this.operationQueue);
        }
        
        // Clear resource pool
        this.resourcePool.clear();
        this.operationQueue = [];
        
        console.log('[EnhancedFileManagerTool] Cleanup completed');
    }

    getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; message?: string } {
        if (this.operationQueue.length > this.maxConcurrentOps * 2) {
            return { 
                status: 'degraded', 
                message: `High operation load: ${this.operationQueue.length} queued operations` 
            };
        }
        
        return { status: 'healthy', message: 'Ready for file operations' };
    }
} 