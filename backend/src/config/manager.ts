/**
 * Enhanced Configuration Manager for ChatSG
 * 
 * Extends existing LLMHelper patterns with Zod validation while maintaining
 * full backward compatibility. Provides type-safe configuration management
 * with enhanced error reporting.
 */

import { 
  validateEnvironment, 
  validateLLMConfiguration, 
  validateAgentConfiguration,
  safeParseWithFallback,
  EnvironmentSchema,
  LLMConfigurationSchema,
  AgentConfigurationSchema,
  type Environment,
  type LLMConfiguration,
  type AgentConfiguration,
  type ValidationResult
} from './schemas';

/**
 * Enhanced Configuration Manager
 * 
 * Provides Zod-based validation on top of existing LLMHelper functionality
 * without breaking existing patterns or APIs.
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private validatedEnvironment: Environment | null = null;
  private validationCache = new Map<string, any>();

  constructor() {
    // Singleton pattern to match LLMHelper
    if (ConfigurationManager.instance) {
      return ConfigurationManager.instance;
    }
    ConfigurationManager.instance = this;
  }

  /**
   * Validate and parse environment variables with Zod
   */
  validateEnvironmentVariables(): ValidationResult & { data?: Environment } {
    if (this.validatedEnvironment) {
      return { valid: true, errors: [], data: this.validatedEnvironment };
    }

    const result = validateEnvironment(process.env);
    
    if (result.success && result.data) {
      this.validatedEnvironment = result.data;
      return { valid: true, errors: [], data: result.data };
    }

    return { valid: false, errors: result.errors };
  }

  /**
   * Validate LLM configuration with enhanced error reporting
   */
  validateLLMConfig(config: any): ValidationResult & { data?: LLMConfiguration } {
    const cacheKey = `llm_${JSON.stringify(config)}`;
    
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey);
      return cached;
    }

    const result = validateLLMConfiguration(config);
    
    const validationResult = result.success 
      ? { valid: true, errors: [], data: result.data || undefined }
      : { valid: false, errors: result.errors, data: undefined };

    this.validationCache.set(cacheKey, validationResult);
    return validationResult;
  }

  /**
   * Validate agent configuration with enhanced error reporting
   */
  validateAgentConfig(config: any, agentType?: string): ValidationResult & { data?: AgentConfiguration } {
    const cacheKey = `agent_${agentType || 'unknown'}_${JSON.stringify(config)}`;
    
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey);
      return cached;
    }

    const result = validateAgentConfiguration(config);
    
    const validationResult = result.success 
      ? { valid: true, errors: [], data: result.data || undefined }
      : { valid: false, errors: result.errors, data: undefined };

    this.validationCache.set(cacheKey, validationResult);
    return validationResult;
  }

  /**
   * Get validated environment configuration
   */
  getValidatedEnvironment(): Environment | null {
    const result = this.validateEnvironmentVariables();
    return result.data || null;
  }

  /**
   * Safe configuration parsing with fallback
   */
  safeParseConfig<T>(
    schema: any, 
    data: any, 
    fallback: T, 
    context?: string
  ): T {
    try {
      return schema.parse(data);
    } catch (error) {
      const contextMsg = context ? ` (${context})` : '';
      console.warn(`[ConfigManager] Validation failed${contextMsg}, using fallback:`, error);
      return fallback;
    }
  }

  /**
   * Enhanced configuration validation with detailed reporting
   */
  validateConfigurationWithDetails(config: any, type: 'llm' | 'agent', context?: string) {
    if (type === 'llm') {
      const result = this.validateLLMConfig(config);
      if (!result.valid) {
        const contextMsg = context ? ` for ${context}` : '';
        console.error(`[ConfigManager] LLM configuration validation failed${contextMsg}:`);
        result.errors.forEach(error => console.error(`  - ${error}`));
      }
      return result;
    } else {
      const result = this.validateAgentConfig(config, context);
      if (!result.valid) {
        const contextMsg = context ? ` for ${context}` : '';
        console.error(`[ConfigManager] Agent configuration validation failed${contextMsg}:`);
        result.errors.forEach(error => console.error(`  - ${error}`));
      }
      return result;
    }
  }

  /**
   * Get configuration validation summary
   */
  getValidationSummary() {
    const envResult = this.validateEnvironmentVariables();
    
    return {
      environment: {
        valid: envResult.valid,
        errorCount: envResult.errors.length,
        errors: envResult.errors,
      },
      cache: {
        entries: this.validationCache.size,
        keys: Array.from(this.validationCache.keys()),
      },
    };
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(pattern?: string) {
    if (pattern) {
      // Clear specific cache entries matching pattern
      const keysToDelete = Array.from(this.validationCache.keys())
        .filter(key => key.includes(pattern));
      keysToDelete.forEach(key => this.validationCache.delete(key));
    } else {
      // Clear all cache
      this.validationCache.clear();
    }
    
    // Reset environment validation
    this.validatedEnvironment = null;
  }

  /**
   * Get type-safe configuration defaults
   */
  getConfigurationDefaults() {
    return {
      environment: EnvironmentSchema.parse({}),
      llm: {
        provider: 'openai' as const,
        temperature: 0.7,
        maxTokens: 3000,
      },
      agent: {
        behavior: {
          promptSelection: {
            strategy: 'intelligent',
            fallback: 'keyword-based',
          },
        },
      },
    };
  }

  /**
   * Validate configuration against multiple schemas
   */
  validateMultiple(configs: Array<{ data: any; type: 'llm' | 'agent'; context?: string }>) {
    const results = configs.map(({ data, type, context }) => ({
      type,
      context,
      result: this.validateConfigurationWithDetails(data, type, context),
    }));

    const allValid = results.every(r => r.result.valid);
    const allErrors = results.flatMap(r => r.result.errors);

    return {
      valid: allValid,
      errors: allErrors,
      details: results,
    };
  }
}

/**
 * Get singleton instance of ConfigurationManager
 */
export function getConfigurationManager(): ConfigurationManager {
  return new ConfigurationManager();
}

/**
 * Reset configuration manager instance (for testing)
 */
export function resetConfigurationManager(): void {
  // @ts-ignore - Access private static member for testing
  ConfigurationManager.instance = null;
}

// Export types for external use
export type {
  Environment,
  LLMConfiguration,
  AgentConfiguration,
  ValidationResult,
}; 