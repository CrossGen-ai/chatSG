"use strict";
/**
 * Zod Validation Schemas for ChatSG Configuration Management
 *
 * This file contains comprehensive validation schemas for:
 * - LLM configurations (OpenAI/Azure)
 * - Agent configurations
 * - Environment variables
 * - Template variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheEntrySchema = exports.ConfigurationPathSchema = exports.ValidationResultSchema = exports.AgentConfigurationSchema = exports.MetadataSchema = exports.BehaviorSchema = exports.TemplateVariableSchema = exports.PromptsSchema = exports.PromptCollectionSchema = exports.AgentInfoSchema = exports.LLMConfigurationSchema = exports.LLMProviderSchema = exports.EnvironmentSchema = void 0;
exports.validateEnvironment = validateEnvironment;
exports.validateLLMConfiguration = validateLLMConfiguration;
exports.validateAgentConfiguration = validateAgentConfiguration;
exports.safeParseWithFallback = safeParseWithFallback;
const zod_1 = require("zod");
// ============================================================================
// Environment Variable Schemas
// ============================================================================
exports.EnvironmentSchema = zod_1.z.object({
    // LLM Provider Configuration
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL: zod_1.z.string().default('gpt-4o'),
    OPENAI_BASE_URL: zod_1.z.string().url().optional(),
    // Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY: zod_1.z.string().optional(),
    AZURE_OPENAI_ENDPOINT: zod_1.z.string().url().optional(),
    AZURE_OPENAI_DEPLOYMENT: zod_1.z.string().default('gpt-4o-001'),
    AZURE_OPENAI_API_VERSION: zod_1.z.string().default('2024-02-15-preview'),
    // General Configuration
    ENVIRONMENT: zod_1.z.enum(['development', 'dev', 'production', 'test']).default('development'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // LLM Behavior Configuration
    LLM_TEMPERATURE: zod_1.z.string().transform(val => parseFloat(val)).pipe(zod_1.z.number().min(0).max(2)).optional(),
    LLM_MAX_TOKENS: zod_1.z.string().transform(val => parseInt(val)).pipe(zod_1.z.number().positive()).optional(),
}).refine((data) => data.OPENAI_API_KEY || (data.AZURE_OPENAI_API_KEY && data.AZURE_OPENAI_ENDPOINT), {
    message: "Either OPENAI_API_KEY or both AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT must be provided",
    path: ["OPENAI_API_KEY"]
});
// ============================================================================
// LLM Configuration Schemas
// ============================================================================
exports.LLMProviderSchema = zod_1.z.enum(['openai', 'azure']);
exports.LLMConfigurationSchema = zod_1.z.object({
    provider: exports.LLMProviderSchema,
    environment: zod_1.z.string(),
    modelName: zod_1.z.string().min(1),
    openAIApiKey: zod_1.z.string().min(1),
    configuration: zod_1.z.object({
        baseURL: zod_1.z.string().url().optional(),
        defaultQuery: zod_1.z.record(zod_1.z.string()).optional(),
        defaultHeaders: zod_1.z.record(zod_1.z.string()).optional(),
    }),
    temperature: zod_1.z.number().min(0).max(2),
    maxTokens: zod_1.z.number().positive(),
    metadata: zod_1.z.record(zod_1.z.any()),
});
// ============================================================================
// Agent Configuration Schemas
// ============================================================================
exports.AgentInfoSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (x.y.z)"),
    description: zod_1.z.string().optional(),
    author: zod_1.z.string().optional(),
    created: zod_1.z.string().optional(),
    lastModified: zod_1.z.string().optional(),
});
exports.PromptCollectionSchema = zod_1.z.object({
    default: zod_1.z.string(),
    analytical: zod_1.z.string().optional(),
    creative: zod_1.z.string().optional(),
    technical: zod_1.z.string().optional(),
    conversational: zod_1.z.string().optional(),
    blank: zod_1.z.string().optional(),
}).and(zod_1.z.record(zod_1.z.string())); // Allow additional prompt variants
exports.PromptsSchema = zod_1.z.object({
    system: exports.PromptCollectionSchema,
    customInstructions: zod_1.z.record(zod_1.z.string()).optional(),
    userTemplates: zod_1.z.record(zod_1.z.string()).optional(),
    errorMessages: zod_1.z.record(zod_1.z.string()).optional(),
});
exports.TemplateVariableSchema = zod_1.z.object({
    description: zod_1.z.string(),
    example: zod_1.z.string().optional(),
    required: zod_1.z.boolean().default(false),
    default: zod_1.z.string().optional(),
});
exports.BehaviorSchema = zod_1.z.object({
    promptSelection: zod_1.z.object({
        strategy: zod_1.z.string(),
        fallback: zod_1.z.string(),
    }).optional(),
}).optional();
exports.MetadataSchema = zod_1.z.object({
    schema_version: zod_1.z.string().optional(),
    schemaVersion: zod_1.z.string().optional(), // Support both naming conventions
    compatible_llm_helper_versions: zod_1.z.array(zod_1.z.string()).optional(),
    last_tested: zod_1.z.string().optional(),
    notes: zod_1.z.array(zod_1.z.string()).optional(),
}).and(zod_1.z.record(zod_1.z.any())); // Allow additional metadata fields
exports.AgentConfigurationSchema = zod_1.z.object({
    agentInfo: exports.AgentInfoSchema,
    prompts: exports.PromptsSchema,
    templateVariables: zod_1.z.record(exports.TemplateVariableSchema),
    behavior: exports.BehaviorSchema,
    metadata: exports.MetadataSchema,
});
// ============================================================================
// Validation Result Schemas
// ============================================================================
exports.ValidationResultSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(zod_1.z.string()),
    warnings: zod_1.z.array(zod_1.z.string()).optional(),
});
// ============================================================================
// Configuration Manager Schemas
// ============================================================================
exports.ConfigurationPathSchema = zod_1.z.object({
    agentType: zod_1.z.string(),
    configPath: zod_1.z.string(),
    exists: zod_1.z.boolean(),
});
exports.CacheEntrySchema = zod_1.z.object({
    config: exports.AgentConfigurationSchema,
    loadedAt: zod_1.z.date(),
    path: zod_1.z.string(),
});
// ============================================================================
// Schema Validation Utilities
// ============================================================================
/**
 * Validate environment variables with detailed error reporting
 */
function validateEnvironment(env) {
    try {
        return {
            success: true,
            data: exports.EnvironmentSchema.parse(env),
            errors: [],
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                data: null,
                errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
            };
        }
        return {
            success: false,
            data: null,
            errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        };
    }
}
/**
 * Validate LLM configuration with detailed error reporting
 */
function validateLLMConfiguration(config) {
    try {
        return {
            success: true,
            data: exports.LLMConfigurationSchema.parse(config),
            errors: [],
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                data: null,
                errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
            };
        }
        return {
            success: false,
            data: null,
            errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        };
    }
}
/**
 * Validate agent configuration with detailed error reporting
 */
function validateAgentConfiguration(config) {
    try {
        return {
            success: true,
            data: exports.AgentConfigurationSchema.parse(config),
            errors: [],
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                data: null,
                errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
            };
        }
        return {
            success: false,
            data: null,
            errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        };
    }
}
/**
 * Safe parsing with fallback for backward compatibility
 */
function safeParseWithFallback(schema, data, fallback) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        console.warn('[ConfigSchema] Falling back to default due to validation error:', error);
        return fallback;
    }
}
//# sourceMappingURL=schemas.js.map