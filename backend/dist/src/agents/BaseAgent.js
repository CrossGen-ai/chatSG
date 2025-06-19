"use strict";
/**
 * Base Agent Interface
 *
 * Standardized interface for all agents in the ChatSG system.
 * Provides common methods and capabilities while preserving existing agent functionality.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractBaseAgent = void 0;
/**
 * Abstract base class providing common functionality
 * Agents can extend this class for shared behavior
 */
class AbstractBaseAgent {
    constructor(name, version = '1.0.0', description = '', type = 'generic') {
        this.name = name;
        this.version = version;
        this.description = description;
        this.type = type;
    }
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            type: this.type
        };
    }
    async initialize(config) {
        // Default implementation - can be overridden
        console.log(`[${this.name}] Initialized`);
    }
    async cleanup() {
        // Default implementation - can be overridden
        console.log(`[${this.name}] Cleaned up`);
    }
}
exports.AbstractBaseAgent = AbstractBaseAgent;
//# sourceMappingURL=BaseAgent.js.map