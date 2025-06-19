"use strict";
/**
 * State Management System
 *
 * Comprehensive state management that enables controlled data sharing
 * between agents while maintaining session isolation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STATE_CONFIG = exports.validateStatePermissions = exports.createStateContext = exports.FilePersistence = exports.MemoryPersistence = exports.initializeStateManager = exports.getStateManager = exports.StateManager = void 0;
// Core interfaces
__exportStar(require("./interfaces"), exports);
// Main state manager
var StateManager_1 = require("./StateManager");
Object.defineProperty(exports, "StateManager", { enumerable: true, get: function () { return StateManager_1.StateManager; } });
Object.defineProperty(exports, "getStateManager", { enumerable: true, get: function () { return StateManager_1.getStateManager; } });
Object.defineProperty(exports, "initializeStateManager", { enumerable: true, get: function () { return StateManager_1.initializeStateManager; } });
// Persistence implementations
var MemoryPersistence_1 = require("./persistence/MemoryPersistence");
Object.defineProperty(exports, "MemoryPersistence", { enumerable: true, get: function () { return MemoryPersistence_1.MemoryPersistence; } });
var FilePersistence_1 = require("./persistence/FilePersistence");
Object.defineProperty(exports, "FilePersistence", { enumerable: true, get: function () { return FilePersistence_1.FilePersistence; } });
// Utility functions
var utils_1 = require("./utils");
Object.defineProperty(exports, "createStateContext", { enumerable: true, get: function () { return utils_1.createStateContext; } });
Object.defineProperty(exports, "validateStatePermissions", { enumerable: true, get: function () { return utils_1.validateStatePermissions; } });
/**
 * Default state configuration
 */
exports.DEFAULT_STATE_CONFIG = {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxSessions: 1000,
    maxSharedStates: 10000,
    enablePersistence: true,
    enableEvents: true,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    defaultPermissions: {
        read: ['*'], // Allow all agents to read by default
        write: [], // No write access by default
        delete: [] // No delete access by default
    }
};
//# sourceMappingURL=index.js.map