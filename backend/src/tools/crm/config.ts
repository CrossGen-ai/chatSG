/**
 * CRM Configuration Management
 * Handles environment variables and configuration for Insightly CRM integration
 */

import { CRMToolConfig } from './types';

// Configuration defaults
const DEFAULTS = {
  API_URL: 'https://api.na1.insightly.com/v3.1',
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW_MS: 1000,
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  MAX_PAGE_SIZE: 50
};

/**
 * Get CRM configuration from environment variables
 * @throws Error if required configuration is missing
 */
export const getCRMConfig = (): CRMToolConfig => {
  // Validate required API key
  const apiKey = process.env.INSIGHTLY_API_KEY;
  if (!apiKey) {
    throw new Error(
      'INSIGHTLY_API_KEY environment variable is required. ' +
      'Please set it to your Insightly API key.'
    );
  }

  // Build configuration object
  const config: CRMToolConfig = {
    apiKey,
    apiUrl: process.env.INSIGHTLY_API_URL || DEFAULTS.API_URL,
    rateLimit: {
      maxRequests: parseInt(
        process.env.CRM_RATE_LIMIT_REQUESTS || String(DEFAULTS.RATE_LIMIT_REQUESTS),
        10
      ),
      windowMs: parseInt(
        process.env.CRM_RATE_LIMIT_WINDOW_MS || String(DEFAULTS.RATE_LIMIT_WINDOW_MS),
        10
      )
    },
    timeout: parseInt(
      process.env.CRM_TIMEOUT || String(DEFAULTS.TIMEOUT),
      10
    ),
    retryAttempts: parseInt(
      process.env.CRM_RETRY_ATTEMPTS || String(DEFAULTS.RETRY_ATTEMPTS),
      10
    ),
    maxPageSize: parseInt(
      process.env.CRM_MAX_PAGE_SIZE || String(DEFAULTS.MAX_PAGE_SIZE),
      10
    )
  };

  // Validate configuration values
  validateConfig(config);

  return config;
};

/**
 * Validate CRM configuration
 * @throws Error if configuration is invalid
 */
const validateConfig = (config: CRMToolConfig): void => {
  // Validate API URL
  try {
    new URL(config.apiUrl);
  } catch (error) {
    throw new Error(`Invalid INSIGHTLY_API_URL: ${config.apiUrl}`);
  }

  // Validate rate limit settings
  if (config.rateLimit.maxRequests < 1 || config.rateLimit.maxRequests > 100) {
    throw new Error('CRM_RATE_LIMIT_REQUESTS must be between 1 and 100');
  }

  if (config.rateLimit.windowMs < 100 || config.rateLimit.windowMs > 60000) {
    throw new Error('CRM_RATE_LIMIT_WINDOW_MS must be between 100 and 60000');
  }

  // Validate timeout
  if (config.timeout < 1000 || config.timeout > 60000) {
    throw new Error('CRM_TIMEOUT must be between 1000 and 60000 milliseconds');
  }

  // Validate retry attempts
  if (config.retryAttempts < 0 || config.retryAttempts > 5) {
    throw new Error('CRM_RETRY_ATTEMPTS must be between 0 and 5');
  }

  // Validate page size
  if (config.maxPageSize < 1 || config.maxPageSize > 500) {
    throw new Error('CRM_MAX_PAGE_SIZE must be between 1 and 500');
  }
};

/**
 * Get regional API URL based on region code
 */
export const getRegionalApiUrl = (region: string): string => {
  const regionMap: Record<string, string> = {
    'na': 'https://api.na1.insightly.com/v3.1',
    'eu': 'https://api.eu1.insightly.com/v3.1',
    'ap': 'https://api.ap1.insightly.com/v3.1'
  };

  return regionMap[region.toLowerCase()] || DEFAULTS.API_URL;
};

/**
 * Mask sensitive information for logging
 */
export const maskApiKey = (apiKey: string): string => {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
};

/**
 * Get configuration summary for logging (with masked sensitive data)
 */
export const getConfigSummary = (config: CRMToolConfig): Record<string, any> => {
  return {
    apiUrl: config.apiUrl,
    apiKey: maskApiKey(config.apiKey),
    rateLimit: config.rateLimit,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    maxPageSize: config.maxPageSize
  };
};