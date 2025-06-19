"use strict";
/**
 * Memory Persistence Implementation
 *
 * In-memory state persistence for development and testing.
 * Data is lost when the process restarts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPersistence = void 0;
class MemoryPersistence {
    constructor(cleanupIntervalMs = 60000) {
        this.storage = new Map();
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, cleanupIntervalMs);
        console.log('[MemoryPersistence] Initialized with cleanup interval:', cleanupIntervalMs + 'ms');
    }
    async store(key, data, ttl) {
        const entry = {
            data,
            createdAt: new Date(),
            ttl
        };
        this.storage.set(key, entry);
        console.log(`[MemoryPersistence] Stored key: ${key}, TTL: ${ttl || 'none'}`);
    }
    async retrieve(key) {
        const entry = this.storage.get(key);
        if (!entry) {
            return null;
        }
        // Check if expired
        if (entry.ttl && Date.now() - entry.createdAt.getTime() > entry.ttl) {
            this.storage.delete(key);
            console.log(`[MemoryPersistence] Key expired and removed: ${key}`);
            return null;
        }
        console.log(`[MemoryPersistence] Retrieved key: ${key}`);
        return entry.data;
    }
    async delete(key) {
        const existed = this.storage.has(key);
        this.storage.delete(key);
        if (existed) {
            console.log(`[MemoryPersistence] Deleted key: ${key}`);
        }
        return existed;
    }
    async exists(key) {
        const entry = this.storage.get(key);
        if (!entry) {
            return false;
        }
        // Check if expired
        if (entry.ttl && Date.now() - entry.createdAt.getTime() > entry.ttl) {
            this.storage.delete(key);
            return false;
        }
        return true;
    }
    async listKeys(prefix) {
        const keys = [];
        for (const [key, entry] of this.storage.entries()) {
            // Check if expired
            if (entry.ttl && Date.now() - entry.createdAt.getTime() > entry.ttl) {
                this.storage.delete(key);
                continue;
            }
            if (!prefix || key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        console.log(`[MemoryPersistence] Listed ${keys.length} keys with prefix: ${prefix || 'none'}`);
        return keys;
    }
    async clear(prefix) {
        let cleared = 0;
        if (prefix) {
            for (const key of this.storage.keys()) {
                if (key.startsWith(prefix)) {
                    this.storage.delete(key);
                    cleared++;
                }
            }
        }
        else {
            cleared = this.storage.size;
            this.storage.clear();
        }
        console.log(`[MemoryPersistence] Cleared ${cleared} entries with prefix: ${prefix || 'all'}`);
    }
    getType() {
        return 'memory';
    }
    /**
     * Get storage statistics
     */
    getStats() {
        let expired = 0;
        let active = 0;
        const now = Date.now();
        for (const [key, entry] of this.storage.entries()) {
            if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
                expired++;
            }
            else {
                active++;
            }
        }
        return {
            total: this.storage.size,
            active,
            expired,
            memoryUsage: this.getMemoryUsage()
        };
    }
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.storage.entries()) {
            if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
                this.storage.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`[MemoryPersistence] Cleanup removed ${cleaned} expired entries`);
        }
    }
    /**
     * Estimate memory usage
     */
    getMemoryUsage() {
        let size = 0;
        for (const [key, entry] of this.storage.entries()) {
            // Rough estimate: key size + JSON serialized data size
            size += key.length * 2; // UTF-16
            size += JSON.stringify(entry.data).length * 2;
            size += 100; // Overhead for entry metadata
        }
        return size;
    }
    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.storage.clear();
        console.log('[MemoryPersistence] Destroyed');
    }
}
exports.MemoryPersistence = MemoryPersistence;
//# sourceMappingURL=MemoryPersistence.js.map