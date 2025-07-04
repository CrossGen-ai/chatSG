/**
 * Mock Authentication Provider for Development
 * Simulates Azure AD authentication flow without actual Azure AD calls
 */

class MockAuthProvider {
  constructor() {
    this.mockUsers = [
      {
        azureId: 'dev-user-001',
        email: 'dev@example.com',
        name: 'Development User',
        groups: ['developers', 'chatsg-users']
      },
      {
        azureId: 'admin-user-001',
        email: 'admin@example.com',
        name: 'Admin User',
        groups: ['administrators', 'chatsg-admins', 'chatsg-users']
      },
      {
        azureId: 'test-user-001',
        email: 'test@example.com',
        name: 'Test User',
        groups: ['testers', 'chatsg-users']
      }
    ];
    
    // Track active sessions
    this.sessions = new Map();
  }

  async getAuthCodeUrl(state, nonce) {
    // In development, return a mock URL that redirects to callback
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const mockCode = Buffer.from(JSON.stringify({ state, nonce })).toString('base64');
    return `${baseUrl}/auth/callback?code=${mockCode}&state=${state}`;
  }

  async acquireTokenByCode(code, state, nonce) {
    try {
      // Decode the mock code
      const decoded = JSON.parse(Buffer.from(code, 'base64').toString());
      
      if (decoded.state !== state) {
        throw new Error('State mismatch in mock auth');
      }
      
      // Return the first mock user by default
      // In a real mock, you might show a user selection screen
      const mockUser = this.mockUsers[0];
      const mockToken = `mock-token-${Date.now()}`;
      
      // Store session
      this.sessions.set(mockToken, {
        user: mockUser,
        createdAt: new Date()
      });
      
      return {
        ...mockUser,
        token: mockToken
      };
    } catch (error) {
      console.error('[MockAuth] Error in mock token acquisition:', error);
      throw error;
    }
  }

  extractUserFromToken(tokenResponse) {
    // In mock mode, token response is already the user object
    return tokenResponse;
  }

  async getTokenSilently(account) {
    // Return a mock token
    return `mock-token-silent-${Date.now()}`;
  }

  async revokeToken(account) {
    // Clear mock session
    for (const [token, session] of this.sessions.entries()) {
      if (session.user.azureId === account.azureId) {
        this.sessions.delete(token);
      }
    }
    console.log('[MockAuth] Mock token revoked');
  }

  // Additional mock methods for testing
  getMockUsers() {
    return this.mockUsers;
  }

  setCurrentMockUser(index) {
    if (index >= 0 && index < this.mockUsers.length) {
      this.currentUserIndex = index;
    }
  }
}

// Factory function to create auth provider based on environment
function createAuthProvider(config) {
  const isDevelopment = process.env.ENVIRONMENT === 'dev' || process.env.NODE_ENV === 'development';
  const useMockAuth = process.env.USE_MOCK_AUTH === 'true';
  
  if (isDevelopment && useMockAuth) {
    console.log('[Auth] Using mock authentication provider');
    return new MockAuthProvider();
  } else {
    console.log('[Auth] Using Azure AD authentication provider');
    // Validate config before creating Azure provider
    if (!config.clientId || !config.clientSecret || !config.tenantId) {
      console.error('[Auth] Missing Azure AD configuration. Please set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID');
      console.log('[Auth] Falling back to mock authentication');
      return new MockAuthProvider();
    }
    const { AzureAuthProvider } = require('./AzureAuthProvider');
    return new AzureAuthProvider(config);
  }
}

module.exports = {
  MockAuthProvider,
  createAuthProvider
};