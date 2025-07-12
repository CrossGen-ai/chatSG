import { ContentValidator } from '../security/ContentValidator';

// Cache for configuration
const configCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch markdown configuration from server
 */
export async function fetchMarkdownConfig(): Promise<any> {
  const cacheKey = 'markdown-config';
  const cached = configCache.get(cacheKey);
  
  // Return cached if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const response = await fetch('/api/config/markdown', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown config: ${response.statusText}`);
    }
    
    const config = await response.json();
    
    // Cache the configuration
    configCache.set(cacheKey, {
      data: config,
      timestamp: Date.now()
    });
    
    return config;
  } catch (error) {
    console.error('Error fetching markdown config:', error);
    
    // Return default config on error
    return {
      enabled: true,
      security: {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'span'],
        allowedAttributes: {
          'a': ['href', 'title'],
          'code': ['class'],
          'span': ['class']
        }
      }
    };
  }
}

/**
 * Fetch security configuration from server
 */
export async function fetchSecurityConfig(): Promise<any> {
  const cacheKey = 'security-config';
  const cached = configCache.get(cacheKey);
  
  // Return cached if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const validator = ContentValidator.getInstance();
    const headers = validator.addCsrfHeaders({
      'Content-Type': 'application/json'
    });
    
    const response = await fetch('/api/config/security', {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch security config: ${response.statusText}`);
    }
    
    const config = await response.json();
    
    // Cache the configuration
    configCache.set(cacheKey, {
      data: config,
      timestamp: Date.now()
    });
    
    return config;
  } catch (error) {
    console.error('Error fetching security config:', error);
    
    // Return minimal config on error
    return {
      validation: {
        maxMessageLength: 10000,
        maxSessionIdLength: 100
      }
    };
  }
}

/**
 * Clear configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear();
}