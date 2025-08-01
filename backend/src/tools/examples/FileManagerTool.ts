/**
 * File Manager Tool
 * 
 * A file management tool that provides basic file operations and analysis capabilities.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../Tool';
import * as path from 'path';
import * as fs from 'fs';

// Declare the require function for legacy modules if needed
declare const require: any;

export class FileManagerTool extends BaseTool {
    constructor() {
        super(
            'file-manager',
            '1.0.0',
            'File management tool with basic file operations and analysis capabilities',
            { 
                enabled: true, 
                timeout: 20000,
                cacheResults: false, // File operations shouldn't be cached
                permissions: ['file-read'] // Required permissions
            },
            {
                author: 'ChatSG Tool System',
                category: 'file',
                tags: ['file', 'directory', 'management', 'analysis']
            }
        );
    }

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'operation',
                    type: 'string',
                    description: 'The file operation to perform',
                    required: true,
                    enum: [
                        'file-info',
                        'file-exists',
                        'analyze-path'
                    ]
                },
                {
                    name: 'path',
                    type: 'string',
                    description: 'File or directory path',
                    required: true
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
                            description: 'File encoding for operations',
                            required: false,
                            enum: ['utf8', 'ascii']
                        }
                    }
                }
            ],
            returns: {
                type: 'object',
                description: 'File operation results',
                properties: {
                    result: 'any',
                    operation: 'string',
                    path: 'string',
                    metadata: 'object'
                }
            },
            examples: [
                {
                    input: {
                        operation: 'file-info',
                        path: 'package.json'
                    },
                    output: {
                        result: {
                            basename: 'package.json',
                            extension: '.json',
                            dirname: '.'
                        },
                        operation: 'file-info',
                        path: 'package.json'
                    },
                    description: 'Get file information'
                }
            ]
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const { operation, path: filePath, options = {} } = params;

            if (!filePath || typeof filePath !== 'string') {
                return this.createErrorResult('Path is required and must be a string');
            }

            let result: any;
            const metadata: any = {};

            switch (operation) {
                case 'file-info':
                    result = await this.getFileInfo(filePath);
                    break;

                case 'file-exists':
                    result = await this.fileExists(filePath);
                    break;

                case 'analyze-path':
                    result = await this.analyzePath(filePath);
                    break;

                default:
                    return this.createErrorResult(`Unknown operation: ${operation}`);
            }

            const executionTime = Date.now() - startTime;

            return this.createSuccessResult({
                result,
                operation,
                path: filePath,
                metadata
            }, `File operation completed: ${operation}`, {
                executionTime
            });

        } catch (error) {
            return this.createErrorResult(`File operation failed: ${(error as Error).message}`);
        }
    }

    private async getFileInfo(filePath: string): Promise<any> {
        try {
            // Use Node.js path module for safe path operations
            return {
                basename: path.basename(filePath),
                extension: path.extname(filePath),
                dirname: path.dirname(filePath),
                isAbsolute: path.isAbsolute(filePath),
                normalized: path.normalize(filePath)
            };

        } catch (error) {
            return { error: `Failed to get file info: ${(error as Error).message}` };
        }
    }

    private async fileExists(filePath: string): Promise<any> {
        try {
            // Simple path analysis without file system access
            return {
                pathProvided: true,
                basename: path.basename(filePath),
                extension: path.extname(filePath),
                analysis: 'Path analysis completed (no file system access)'
            };

        } catch (error) {
            return {
                pathProvided: false,
                error: (error as Error).message
            };
        }
    }

    private async analyzePath(filePath: string): Promise<any> {
        try {
            const analysis = {
                original: filePath,
                basename: path.basename(filePath),
                dirname: path.dirname(filePath),
                extension: path.extname(filePath),
                isAbsolute: path.isAbsolute(filePath),
                normalized: path.normalize(filePath),
                parsed: path.parse(filePath)
            };

            return analysis;

        } catch (error) {
            return { error: `Failed to analyze path: ${(error as Error).message}` };
        }
    }
}
