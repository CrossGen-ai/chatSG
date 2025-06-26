/**
 * SessionStorage Class
 * 
 * Manages JSONL file operations for chat sessions.
 * Each session has its own JSONL file for append-only message storage.
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import * as readline from 'readline';

export interface Message {
    timestamp: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    metadata: MessageMetadata;
}

export interface MessageMetadata {
    sessionId: string;
    userId?: string;
    agent?: string;
    confidence?: number;
    processingTime?: number;
    toolsUsed?: string[];
    [key: string]: any;
}

export interface SessionStorageConfig {
    basePath: string;
    maxMessagesPerRead?: number;
}

export class SessionStorage {
    private config: SessionStorageConfig;
    private writeStreams: Map<string, fs.WriteStream> = new Map();
    
    constructor(config: SessionStorageConfig) {
        this.config = {
            maxMessagesPerRead: 1000,
            ...config
        };
        
        // Ensure base directory exists
        this.ensureDirectoryExists();
    }
    
    private async ensureDirectoryExists(): Promise<void> {
        try {
            await fsPromises.mkdir(this.config.basePath, { recursive: true });
        } catch (error) {
            console.error('[SessionStorage] Failed to create directory:', error);
            throw error;
        }
    }
    
    private getSessionFilePath(sessionId: string): string {
        return path.join(this.config.basePath, `session_${sessionId}.jsonl`);
    }
    
    private getToolsFilePath(sessionId: string): string {
        return path.join(this.config.basePath, `session_${sessionId}_tools.jsonl`);
    }
    
    /**
     * Append a message to the session's JSONL file
     */
    async appendMessage(sessionId: string, message: Message): Promise<void> {
        const filePath = this.getSessionFilePath(sessionId);
        const line = JSON.stringify(message) + '\n';
        
        try {
            // Get or create write stream for this session
            let stream = this.writeStreams.get(sessionId);
            if (!stream || stream.destroyed) {
                stream = createWriteStream(filePath, { flags: 'a' });
                this.writeStreams.set(sessionId, stream);
                
                // Handle stream errors
                stream.on('error', (error) => {
                    console.error(`[SessionStorage] Write stream error for session ${sessionId}:`, error);
                    this.writeStreams.delete(sessionId);
                });
            }
            
            // Write the message
            await new Promise<void>((resolve, reject) => {
                stream.write(line, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            console.log(`[SessionStorage] Appended message to session ${sessionId}`);
        } catch (error) {
            console.error(`[SessionStorage] Failed to append message to session ${sessionId}:`, error);
            throw error;
        }
    }
    
    /**
     * Read messages from a session's JSONL file
     */
    async readMessages(
        sessionId: string, 
        options?: { 
            limit?: number; 
            offset?: number;
            reverse?: boolean;
        }
    ): Promise<Message[]> {
        const filePath = this.getSessionFilePath(sessionId);
        const messages: Message[] = [];
        
        try {
            // Check if file exists
            await fsPromises.access(filePath);
            
            // Read file line by line
            const fileStream = createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            
            let lineNumber = 0;
            const offset = options?.offset || 0;
            const limit = options?.limit || this.config.maxMessagesPerRead!;
            
            for await (const line of rl) {
                if (line.trim()) {
                    if (lineNumber >= offset) {
                        try {
                            const message = JSON.parse(line) as Message;
                            messages.push(message);
                            
                            if (messages.length >= limit) {
                                break;
                            }
                        } catch (parseError) {
                            console.warn(`[SessionStorage] Failed to parse line ${lineNumber} in session ${sessionId}:`, parseError);
                        }
                    }
                    lineNumber++;
                }
            }
            
            // Close the stream
            fileStream.close();
            
            // Reverse if requested (for showing latest messages first)
            if (options?.reverse) {
                messages.reverse();
            }
            
            console.log(`[SessionStorage] Read ${messages.length} messages from session ${sessionId}`);
            return messages;
            
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(`[SessionStorage] Session file not found for ${sessionId}`);
                return [];
            }
            console.error(`[SessionStorage] Failed to read messages from session ${sessionId}:`, error);
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
     * Read last N messages from a session
     */
    async readLastMessages(sessionId: string, count: number): Promise<Message[]> {
        // First, count total messages
        const allMessages = await this.readAllMessages(sessionId);
        const totalCount = allMessages.length;
        
        if (totalCount <= count) {
            return allMessages;
        }
        
        // Return last N messages
        return allMessages.slice(totalCount - count);
    }
    
    /**
     * Check if a session exists
     */
    async sessionExists(sessionId: string): Promise<boolean> {
        const filePath = this.getSessionFilePath(sessionId);
        try {
            await fsPromises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Delete a session's files (used for hard delete)
     */
    async deleteSession(sessionId: string): Promise<void> {
        // Close any open write streams
        const stream = this.writeStreams.get(sessionId);
        if (stream) {
            stream.end();
            this.writeStreams.delete(sessionId);
        }
        
        // Delete files
        const messageFile = this.getSessionFilePath(sessionId);
        const toolsFile = this.getToolsFilePath(sessionId);
        
        try {
            await fsPromises.unlink(messageFile);
            console.log(`[SessionStorage] Deleted message file for session ${sessionId}`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error(`[SessionStorage] Failed to delete message file for session ${sessionId}:`, error);
            }
        }
        
        try {
            await fsPromises.unlink(toolsFile);
            console.log(`[SessionStorage] Deleted tools file for session ${sessionId}`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error(`[SessionStorage] Failed to delete tools file for session ${sessionId}:`, error);
            }
        }
    }
    
    /**
     * Get message count for a session (efficient counting)
     */
    async getMessageCount(sessionId: string): Promise<number> {
        const filePath = this.getSessionFilePath(sessionId);
        let count = 0;
        
        try {
            const fileStream = createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            
            for await (const line of rl) {
                if (line.trim()) {
                    count++;
                }
            }
            
            fileStream.close();
            return count;
            
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return 0;
            }
            throw error;
        }
    }
    
    /**
     * Close all write streams (call on shutdown)
     */
    async closeAllStreams(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (const [sessionId, stream] of this.writeStreams.entries()) {
            if (!stream.destroyed) {
                promises.push(new Promise((resolve) => {
                    stream.end(() => {
                        console.log(`[SessionStorage] Closed stream for session ${sessionId}`);
                        resolve();
                    });
                }));
            }
        }
        
        await Promise.all(promises);
        this.writeStreams.clear();
    }
    
    /**
     * Flush a specific session's write stream
     */
    async flushSession(sessionId: string): Promise<void> {
        const stream = this.writeStreams.get(sessionId);
        if (stream && !stream.destroyed) {
            await new Promise<void>((resolve) => {
                stream.write('', () => resolve());
            });
        }
    }
}