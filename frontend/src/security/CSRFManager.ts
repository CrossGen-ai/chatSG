/**
 * CSRF Token Manager for development with proxy
 * Uses response headers instead of cookies
 */

class CSRFManager {
  private static instance: CSRFManager;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  
  private constructor() {}
  
  static getInstance(): CSRFManager {
    if (!CSRFManager.instance) {
      CSRFManager.instance = new CSRFManager();
    }
    return CSRFManager.instance;
  }
  
  /**
   * Get current CSRF token, refreshing if needed
   */
  async getToken(): Promise<string | null> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry > Date.now()) {
      console.log('[CSRFManager] Using cached token');
      return this.token;
    }
    
    // Refresh token
    console.log('[CSRFManager] Refreshing token...');
    await this.refreshToken();
    return this.token;
  }
  
  /**
   * Refresh CSRF token by making a GET request
   */
  private async refreshToken(): Promise<void> {
    try {
      const response = await fetch('/api/config/security', {
        credentials: 'include'
      });
      
      if (response.ok) {
        // Get token from response header
        const token = response.headers.get('X-CSRF-Token');
        if (token) {
          this.token = token;
          this.tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
          console.log('[CSRFManager] Token refreshed from header:', token.substring(0, 20) + '...');
        } else {
          console.warn('[CSRFManager] No CSRF token in response headers');
        }
      }
    } catch (error) {
      console.error('[CSRFManager] Failed to refresh token:', error);
    }
  }
  
  /**
   * Add CSRF headers to request
   */
  async addHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
    const token = await this.getToken();
    
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token
      };
    }
    
    return headers;
  }
  
  /**
   * Extract and store token from any response
   */
  extractTokenFromResponse(response: Response): void {
    const token = response.headers.get('X-CSRF-Token');
    if (token && token !== this.token) {
      this.token = token;
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);
      console.log('[CSRFManager] Token updated from response');
    }
  }
}

export const csrfManager = CSRFManager.getInstance();