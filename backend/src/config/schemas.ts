/**
 * Zod Validation Schemas for ChatSG Configuration Management
 * 
 * This file contains comprehensive validation schemas for:
 * - LLM configurations (OpenAI/Azure)
 * - Agent configurations
 * - Environment variables
 * - Template variables
 */

import { z } from 'zod';

// ============================================================================
// Environment Variable Schemas
// ============================================================================

export const EnvironmentSchema = z.object({
  // LLM Provider Configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_BASE_URL: z.string().url().optional(),
  
  // Azure OpenAI Configuration
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().default('gpt-4o-001'),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-02-15-preview'),
  
  // General Configuration
  ENVIRONMENT: z.enum(['development', 'dev', 'production', 'test']).default('development'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // LLM Behavior Configuration
  LLM_TEMPERATURE: z.string().transform(val => parseFloat(val)).pipe(
    z.number().min(0).max(2)
  ).optional(),
  LLM_MAX_TOKENS: z.string().transform(val => parseInt(val)).pipe(
    z.number().positive()
  ).optional(),
}).refine(
  (data) => data.OPENAI_API_KEY || (data.AZURE_OPENAI_API_KEY && data.AZURE_OPENAI_ENDPOINT),
  {
    message: "Either OPENAI_API_KEY or both AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT must be provided",
    path: ["OPENAI_API_KEY"]
  }
);

// ============================================================================
// LLM Configuration Schemas
// ============================================================================

export const LLMProviderSchema = z.enum(['openai', 'azure']);

export const LLMConfigurationSchema = z.object({
  provider: LLMProviderSchema,
  environment: z.string(),
  modelName: z.string().min(1),
  openAIApiKey: z.string().min(1),
  configuration: z.object({
    baseURL: z.string().url().optional(),
    defaultQuery: z.record(z.string()).optional(),
    defaultHeaders: z.record(z.string()).optional(),
  }),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
  metadata: z.record(z.any()),
});

// ============================================================================
// Agent Configuration Schemas
// ============================================================================

export const AgentInfoSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (x.y.z)"),
  description: z.string().optional(),
  author: z.string().optional(),
  created: z.string().optional(),
  lastModified: z.string().optional(),
});

export const PromptCollectionSchema = z.object({
  default: z.string(),
  analytical: z.string().optional(),
  creative: z.string().optional(),
  technical: z.string().optional(),
  conversational: z.string().optional(),
  blank: z.string().optional(),
}).and(z.record(z.string())); // Allow additional prompt variants

export const PromptsSchema = z.object({
  system: PromptCollectionSchema,
  customInstructions: z.record(z.string()).optional(),
  userTemplates: z.record(z.string()).optional(),
  errorMessages: z.record(z.string()).optional(),
});

export const TemplateVariableSchema = z.object({
  description: z.string(),
  example: z.string().optional(),
  required: z.boolean().default(false),
  default: z.string().optional(),
});

export const BehaviorSchema = z.object({
  promptSelection: z.object({
    strategy: z.string(),
    fallback: z.string(),
  }).optional(),
}).optional();

export const MetadataSchema = z.object({
  schema_version: z.string().optional(),
  schemaVersion: z.string().optional(), // Support both naming conventions
  compatible_llm_helper_versions: z.array(z.string()).optional(),
  last_tested: z.string().optional(),
  notes: z.array(z.string()).optional(),
}).and(z.record(z.any())); // Allow additional metadata fields

export const AgentConfigurationSchema = z.object({
  agentInfo: AgentInfoSchema,
  prompts: PromptsSchema,
  templateVariables: z.record(TemplateVariableSchema),
  behavior: BehaviorSchema,
  metadata: MetadataSchema,
});

// ============================================================================
// Validation Result Schemas
// ============================================================================

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
});

// ============================================================================
// Configuration Manager Schemas
// ============================================================================

export const ConfigurationPathSchema = z.object({
  agentType: z.string(),
  configPath: z.string(),
  exists: z.boolean(),
});

export const CacheEntrySchema = z.object({
  config: AgentConfigurationSchema,
  loadedAt: z.date(),
  path: z.string(),
});

// ============================================================================
// Type Inference Exports
// ============================================================================

export type Environment = z.infer<typeof EnvironmentSchema>;
export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type LLMConfiguration = z.infer<typeof LLMConfigurationSchema>;
export type AgentInfo = z.infer<typeof AgentInfoSchema>;
export type PromptCollection = z.infer<typeof PromptCollectionSchema>;
export type Prompts = z.infer<typeof PromptsSchema>;
export type TemplateVariable = z.infer<typeof TemplateVariableSchema>;
export type Behavior = z.infer<typeof BehaviorSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type AgentConfiguration = z.infer<typeof AgentConfigurationSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type ConfigurationPath = z.infer<typeof ConfigurationPathSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

// ============================================================================
// Schema Validation Utilities
// ============================================================================

/**
 * Validate environment variables with detailed error reporting
 */
export function validateEnvironment(env: Record<string, string | undefined>) {
  try {
    return {
      success: true,
      data: EnvironmentSchema.parse(env),
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export function validateLLMConfiguration(config: any) {
  try {
    return {
      success: true,
      data: LLMConfigurationSchema.parse(config),
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export function validateAgentConfiguration(config: any) {
  try {
    return {
      success: true,
      data: AgentConfigurationSchema.parse(config),
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export function safeParseWithFallback<T>(schema: z.ZodSchema<T>, data: any, fallback: T): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.warn('[ConfigSchema] Falling back to default due to validation error:', error);
    return fallback;
  }
} 