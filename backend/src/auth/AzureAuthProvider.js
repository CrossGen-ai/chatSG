const msal = require('@azure/msal-node');
const crypto = require('crypto');

class AzureAuthProvider {
  constructor(config) {
    console.log('[AzureAuth] Initializing with config:', {
      clientId: config.clientId ? 'present' : 'missing',
      clientSecret: config.clientSecret ? 'present' : 'missing',
      tenantId: config.tenantId ? 'present' : 'missing',
      authority: config.authority,
      redirectUri: config.redirectUri
    });

    this.msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: config.authority, // https://login.microsoftonline.us/{tenant}
        clientSecret: config.clientSecret
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (!containsPii) {
              console.log(`[MSAL ${level}] ${message}`);
            }
          },
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Info
        }
      }
    };
    
    this.confidentialClient = new msal.ConfidentialClientApplication(this.msalConfig);
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes || ['openid', 'profile', 'email', 'User.Read'];
    
    // Store PKCE verifiers temporarily (in production, use Redis or session)
    this.pkceCache = new Map();
    
    console.log('[AzureAuth] Initialized successfully with scopes:', this.scopes);
  }

  generatePkceCodes() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    
    return { verifier, challenge };
  }

  async getAuthCodeUrl(state, nonce) {
    try {
      console.log('[AzureAuth] getAuthCodeUrl called with:', { 
        state: state,
        nonce: nonce,
        redirectUri: this.redirectUri 
      });
      
      const pkceCodes = this.generatePkceCodes();
      console.log('[AzureAuth] Generated PKCE codes:', {
        verifierLength: pkceCodes.verifier.length,
        challengeLength: pkceCodes.challenge.length
      });
      
      // Store PKCE verifier for later use with timestamp
      this.pkceCache.set(state, {
        verifier: pkceCodes.verifier,
        timestamp: Date.now()
      });
      console.log('[AzureAuth] PKCE verifier stored for state:', state);
      console.log('[AzureAuth] Current PKCE cache size:', this.pkceCache.size);
      
      // Clean up old entries (older than 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      let cleanedCount = 0;
      for (const [key, value] of this.pkceCache.entries()) {
        if (value.timestamp && value.timestamp < tenMinutesAgo) {
          this.pkceCache.delete(key);
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        console.log('[AzureAuth] Cleaned up', cleanedCount, 'old PKCE entries');
      }
      
      const authCodeUrlParameters = {
        scopes: this.scopes,
        redirectUri: this.redirectUri,
        codeChallenge: pkceCodes.challenge,
        codeChallengeMethod: 'S256',
        state: state,
        nonce: nonce,
        responseMode: 'query'
      };
      
      console.log('[AzureAuth] Auth code URL parameters:', authCodeUrlParameters);
      
      const url = await this.confidentialClient.getAuthCodeUrl(authCodeUrlParameters);
      console.log('[AzureAuth] Generated auth URL successfully');
      console.log('[AzureAuth] Auth URL (first 100 chars):', url.substring(0, 100) + '...');
      return url;
    } catch (error) {
      console.error('[AzureAuth] Error generating auth URL:', error);
      console.error('[AzureAuth] Error details:', error.message);
      console.error('[AzureAuth] Error stack:', error.stack);
      throw error;
    }
  }

  async acquireTokenByCode(code, state, nonce) {
    try {
      console.log('[AzureAuth] acquireTokenByCode called with:', {
        codeLength: code ? code.length : 0,
        state: state,
        nonce: nonce
      });
      
      // Retrieve PKCE verifier
      console.log('[AzureAuth] Looking for PKCE verifier for state:', state);
      console.log('[AzureAuth] Current PKCE cache keys:', Array.from(this.pkceCache.keys()));
      
      const verifierData = this.pkceCache.get(state);
      if (!verifierData) {
        console.error('[AzureAuth] PKCE verifier not found! Cache contents:', 
          Array.from(this.pkceCache.entries()).map(([k, v]) => ({
            key: k,
            hasVerifier: !!v.verifier,
            timestamp: v.timestamp
          }))
        );
        throw new Error('PKCE verifier not found for state');
      }
      
      const codeVerifier = verifierData.verifier || verifierData; // Handle both old and new format
      console.log('[AzureAuth] PKCE verifier found, length:', codeVerifier.length);
      
      // Clean up used verifier
      this.pkceCache.delete(state);
      console.log('[AzureAuth] PKCE verifier removed from cache');
      
      const tokenRequest = {
        code: code,
        scopes: this.scopes,
        redirectUri: this.redirectUri,
        codeVerifier: codeVerifier,
        state: state,
        nonce: nonce
      };
      
      console.log('[AzureAuth] Token request prepared:', {
        ...tokenRequest,
        code: tokenRequest.code.substring(0, 20) + '...',
        codeVerifier: tokenRequest.codeVerifier.substring(0, 20) + '...'
      });
      
      console.log('[AzureAuth] Calling MSAL acquireTokenByCode...');
      const response = await this.confidentialClient.acquireTokenByCode(tokenRequest);
      console.log('[AzureAuth] Token acquired successfully');
      console.log('[AzureAuth] Token response has properties:', Object.keys(response));
      
      return this.extractUserFromToken(response);
    } catch (error) {
      console.error('[AzureAuth] Error acquiring token:', error);
      console.error('[AzureAuth] Error type:', error.constructor.name);
      console.error('[AzureAuth] Error message:', error.message);
      if (error.errorCode) {
        console.error('[AzureAuth] Error code:', error.errorCode);
      }
      if (error.errorMessage) {
        console.error('[AzureAuth] Error message from MSAL:', error.errorMessage);
      }
      console.error('[AzureAuth] Full error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  extractUserFromToken(tokenResponse) {
    const { idTokenClaims, accessToken } = tokenResponse;
    
    // Extract user information from ID token claims
    const user = {
      azureId: idTokenClaims.oid || idTokenClaims.sub,
      email: idTokenClaims.email || idTokenClaims.preferred_username,
      name: idTokenClaims.name || idTokenClaims.given_name,
      groups: idTokenClaims.groups || [],
      token: accessToken
    };
    
    // Log extracted user info (without sensitive data)
    console.log('[AzureAuth] Extracted user:', {
      azureId: user.azureId,
      email: user.email,
      name: user.name,
      groupCount: user.groups.length
    });
    
    return user;
  }

  async getTokenSilently(account) {
    try {
      const silentRequest = {
        account: account,
        scopes: this.scopes
      };
      
      const response = await this.confidentialClient.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.error('[AzureAuth] Silent token acquisition failed:', error);
      throw error;
    }
  }

  async revokeToken(account) {
    try {
      // MSAL doesn't directly support token revocation
      // Clear from cache instead
      const tokenCache = this.confidentialClient.getTokenCache();
      await tokenCache.removeAccount(account);
      console.log('[AzureAuth] Token cache cleared for account');
    } catch (error) {
      console.error('[AzureAuth] Error revoking token:', error);
      throw error;
    }
  }
}

module.exports = { AzureAuthProvider };