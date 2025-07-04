import { sanitizeInput } from '../utils/sanitizer';

interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

interface CSRFToken {
  token: string;
  expires: number;
}

class ContentValidator {
  private static instance: ContentValidator;
  private csrfToken: CSRFToken | null = null;
  private securityConfig: any = null;
  
  private constructor() {
    // Initialize on first use
    this.initialize();
  }
  
  static getInstance(): ContentValidator {
    if (!ContentValidator.instance) {
      ContentValidator.instance = new ContentValidator();
    }
    return ContentValidator.instance;
  }
  
  private async initialize() {
    // Load security config
    try {
      const response = await fetch('/api/config/security');
      if (response.ok) {
        this.securityConfig = await response.json();
      }
    } catch (error) {
      console.error('Failed to load security config:', error);
    }
    
    // Get initial CSRF token
    await this.refreshCSRFToken();
  }
  
  /**
   * Get current CSRF token, refreshing if needed
   */
  async getCSRFToken(): Promise<string | null> {
    // For double-submit pattern, always read from cookie
    const cookieToken = this.getCookieValue('csrf-token');
    
    console.log('[ContentValidator] Getting CSRF token:', {
      cookieToken: cookieToken ? cookieToken.substring(0, 20) + '...' : 'none',
      allCookies: document.cookie
    });
    
    if (cookieToken) {
      return cookieToken;
    }
    
    // If no cookie token, try to get one by making a GET request
    await this.refreshCSRFToken();
    
    // Try reading from cookie again
    const newToken = this.getCookieValue('csrf-token');
    console.log('[ContentValidator] After refresh, token:', newToken ? newToken.substring(0, 20) + '...' : 'none');
    
    return newToken;
  }
  
  /**
   * Refresh CSRF token from server
   */
  private async refreshCSRFToken(): Promise<void> {
    try {
      // Make a GET request to any API endpoint to trigger CSRF cookie generation
      const response = await fetch('/api/config/security', {
        credentials: 'include' // Important for cookies
      });
      
      if (response.ok) {
        // Token is set as a cookie by the server
        // We don't need to store it separately for double-submit pattern
        const cookieToken = this.getCookieValue('csrf-token');
        if (cookieToken) {
          console.log('[CSRF] Token refreshed from cookie');
        } else {
          console.warn('[CSRF] No token found in cookie after refresh');
        }
      }
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  }
  
  /**
   * Get cookie value by name
   */
  private getCookieValue(name: string): string | null {
    console.log('[ContentValidator] Looking for cookie:', name);
    console.log('[ContentValidator] All cookies:', document.cookie);
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    const value = match ? match[2] : null;
    console.log('[ContentValidator] Cookie value:', value ? 'found' : 'not found');
    return value;
  }
  
  /**
   * Validate message content before sending
   */
  validateMessage(content: string): ValidationResult {
    // Check if empty
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    // Check length
    const maxLength = this.securityConfig?.validation?.maxMessageLength || 10000;
    if (content.length > maxLength) {
      return { 
        valid: false, 
        error: `Message too long. Maximum ${maxLength} characters allowed.` 
      };
    }
    
    // Sanitize input
    const sanitized = sanitizeInput(content);
    
    // Check if content was modified significantly
    if (sanitized.length < content.length * 0.5) {
      return { 
        valid: false, 
        error: 'Message contains too much invalid content' 
      };
    }
    
    return { 
      valid: true, 
      sanitized 
    };
  }
  
  /**
   * Validate session ID
   */
  validateSessionId(sessionId: string): ValidationResult {
    // Check format
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return { 
        valid: false, 
        error: 'Invalid session ID format' 
      };
    }
    
    // Check length
    const maxLength = this.securityConfig?.validation?.maxSessionIdLength || 100;
    if (sessionId.length > maxLength) {
      return { 
        valid: false, 
        error: `Session ID too long. Maximum ${maxLength} characters allowed.` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Add CSRF token to request headers
   */
  async addCSRFHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
    const token = await this.getCSRFToken();
    console.log('[ContentValidator] addCSRFHeaders - token:', token ? token.substring(0, 20) + '...' : 'none');
    
    if (token) {
      const newHeaders = {
        ...headers,
        'X-CSRF-Token': token
      };
      console.log('[ContentValidator] Headers with CSRF:', Object.keys(newHeaders));
      return newHeaders;
    }
    console.log('[ContentValidator] No CSRF token, returning original headers');
    return headers;
  }
  
  /**
   * Log security event
   */
  logSecurityEvent(event: string, details?: any): void {
    // In production, this would send to a security monitoring service
    console.log(`[Security Event] ${event}`, details);
  }
  
  /**
   * Check if content contains potential security threats
   */
  checkForThreats(content: string): string[] {
    const threats: string[] = [];
    
    // Check for script injection attempts
    if (/<script/i.test(content)) {
      threats.push('Script tag detected');
    }
    
    // Check for event handlers
    if (/on\w+\s*=/i.test(content)) {
      threats.push('Event handler detected');
    }
    
    // Check for data URIs that could be malicious
    if (/data:.*script/i.test(content)) {
      threats.push('Suspicious data URI detected');
    }
    
    // Check for iframe injection
    if (/<iframe/i.test(content)) {
      threats.push('IFrame detected');
    }
    
    return threats;
  }
}

// Export singleton instance
export const contentValidator = ContentValidator.getInstance();