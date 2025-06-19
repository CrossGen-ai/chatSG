/**
 * File Persistence Implementation
 * 
 * File-based state persistence for production use.
 * Data is persisted to disk and survives process restarts.
 */

import { StatePersistence } from '../interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

interface FileEntry {
    data: any;
    createdAt: string;
    ttl?: number;
}

export class FilePersistence implements StatePersistence {
    private basePath: string;
    private indexFile: string;
    private index: Map<string, { file: string; ttl?: number; createdAt: Date }> = new Map();
    private cleanupInterval?: NodeJS.Timeout;

    constructor(basePath: string = './data/state', cleanupIntervalMs: number = 300000) {
        this.basePath = path.resolve(basePath);
        this.indexFile = path.join(this.basePath, 'index.json');
        
        // Start cleanup interval (5 minutes default)
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, cleanupIntervalMs);

        console.log('[FilePersistence] Initialized with base path:', this.basePath);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Ensure base directory exists
            await fs.mkdir(this.basePath, { recursive: true });
            
            // Load index if it exists
            await this.loadIndex();
            
            console.log(`[FilePersistence] Initialized with ${this.index.size} entries`);
        } catch (error) {
            console.error('[FilePersistence] Initialization failed:', error);
            throw error;
        }
    }

    private async loadIndex(): Promise<void> {
        try {
            const indexData = await fs.readFile(this.indexFile, 'utf-8');
            const indexObj = JSON.parse(indexData);
            
            this.index.clear();
            for (const [key, entry] of Object.entries(indexObj)) {
                const typedEntry = entry as { file: string; ttl?: number; createdAt: string };
                this.index.set(key, {
                    file: typedEntry.file,
                    ttl: typedEntry.ttl,
                    createdAt: new Date(typedEntry.createdAt)
                });
            }
            
            console.log(`[FilePersistence] Loaded index with ${this.index.size} entries`);
        } catch (error) {
            if ((error as any).code !== 'ENOENT') {
                console.warn('[FilePersistence] Failed to load index:', error);
            }
            // If index doesn't exist, start with empty index
        }
    }

    private async saveIndex(): Promise<void> {
        const indexObj: Record<string, any> = {};
        
        for (const [key, entry] of this.index.entries()) {
            indexObj[key] = {
                file: entry.file,
                ttl: entry.ttl,
                createdAt: entry.createdAt.toISOString()
            };
        }

        await fs.writeFile(this.indexFile, JSON.stringify(indexObj, null, 2));
    }

    private generateFileName(key: string): string {
        // Create safe filename from key
        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        const hash = this.simpleHash(key);
        return `${safeKey}_${hash}.json`;
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    async store(key: string, data: any, ttl?: number): Promise<void> {
        try {
            const fileName = this.generateFileName(key);
            const filePath = path.join(this.basePath, fileName);
            
            const entry: FileEntry = {
                data,
                createdAt: new Date().toISOString(),
                ttl
            };

            await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
            
            // Update index
            this.index.set(key, {
                file: fileName,
                ttl,
                createdAt: new Date()
            });
            
            await this.saveIndex();
            
            console.log(`[FilePersistence] Stored key: ${key} in file: ${fileName}`);
        } catch (error) {
            console.error(`[FilePersistence] Failed to store key ${key}:`, error);
            throw error;
        }
    }

    async retrieve(key: string): Promise<any> {
        try {
            const indexEntry = this.index.get(key);
            
            if (!indexEntry) {
                return null;
            }

            // Check if expired
            if (indexEntry.ttl && Date.now() - indexEntry.createdAt.getTime() > indexEntry.ttl) {
                await this.delete(key);
                return null;
            }

            const filePath = path.join(this.basePath, indexEntry.file);
            const fileData = await fs.readFile(filePath, 'utf-8');
            const entry: FileEntry = JSON.parse(fileData);

            // Double-check expiration from file data
            if (entry.ttl && Date.now() - new Date(entry.createdAt).getTime() > entry.ttl) {
                await this.delete(key);
                return null;
            }

            console.log(`[FilePersistence] Retrieved key: ${key}`);
            return entry.data;
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                // File doesn't exist, remove from index
                this.index.delete(key);
                await this.saveIndex();
                return null;
            }
            
            console.error(`[FilePersistence] Failed to retrieve key ${key}:`, error);
            throw error;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const indexEntry = this.index.get(key);
            
            if (!indexEntry) {
                return false;
            }

            const filePath = path.join(this.basePath, indexEntry.file);
            
            try {
                await fs.unlink(filePath);
            } catch (error) {
                if ((error as any).code !== 'ENOENT') {
                    console.warn(`[FilePersistence] Failed to delete file for key ${key}:`, error);
                }
            }

            this.index.delete(key);
            await this.saveIndex();
            
            console.log(`[FilePersistence] Deleted key: ${key}`);
            return true;
        } catch (error) {
            console.error(`[FilePersistence] Failed to delete key ${key}:`, error);
            throw error;
        }
    }

    async exists(key: string): Promise<boolean> {
        const indexEntry = this.index.get(key);
        
        if (!indexEntry) {
            return false;
        }

        // Check if expired
        if (indexEntry.ttl && Date.now() - indexEntry.createdAt.getTime() > indexEntry.ttl) {
            await this.delete(key);
            return false;
        }

        return true;
    }

    async listKeys(prefix?: string): Promise<string[]> {
        const keys: string[] = [];
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.index.entries()) {
            // Check if expired
            if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
                expiredKeys.push(key);
                continue;
            }

            if (!prefix || key.startsWith(prefix)) {
                keys.push(key);
            }
        }

        // Clean up expired keys
        for (const expiredKey of expiredKeys) {
            await this.delete(expiredKey);
        }

        console.log(`[FilePersistence] Listed ${keys.length} keys with prefix: ${prefix || 'none'}`);
        return keys;
    }

    async clear(prefix?: string): Promise<void> {
        let cleared = 0;
        const keysToDelete: string[] = [];

        for (const key of this.index.keys()) {
            if (!prefix || key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            await this.delete(key);
            cleared++;
        }

        console.log(`[FilePersistence] Cleared ${cleared} entries with prefix: ${prefix || 'all'}`);
    }

    getType(): string {
        return 'file';
    }

    /**
     * Get storage statistics
     */
    async getStats() {
        let expired = 0;
        let active = 0;
        let totalSize = 0;
        const now = Date.now();

        for (const [key, entry] of this.index.entries()) {
            if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
                expired++;
            } else {
                active++;
                
                // Try to get file size
                try {
                    const filePath = path.join(this.basePath, entry.file);
                    const stats = await fs.stat(filePath);
                    totalSize += stats.size;
                } catch (error) {
                    // File might not exist
                }
            }
        }

        return {
            total: this.index.size,
            active,
            expired,
            diskUsage: totalSize,
            basePath: this.basePath
        };
    }

    /**
     * Cleanup expired entries
     */
    private async cleanup(): Promise<void> {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.index.entries()) {
            if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
                expiredKeys.push(key);
            }
        }

        if (expiredKeys.length > 0) {
            for (const key of expiredKeys) {
                await this.delete(key);
            }
            console.log(`[FilePersistence] Cleanup removed ${expiredKeys.length} expired entries`);
        }
    }

    /**
     * Cleanup and destroy
     */
    async destroy(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        
        console.log('[FilePersistence] Destroyed');
    }
} 