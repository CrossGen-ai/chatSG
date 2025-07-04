const msal = require('@azure/msal-node');
const crypto = require('crypto');

class AzureAuthProvider {
  constructor(config) {
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
      const pkceCodes = this.generatePkceCodes();
      
      // Store PKCE verifier for later use
      this.pkceCache.set(state, pkceCodes.verifier);
      
      // Clean up old entries (older than 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      for (const [key, value] of this.pkceCache.entries()) {
        if (value.timestamp && value.timestamp < tenMinutesAgo) {
          this.pkceCache.delete(key);
        }
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
      
      const url = await this.confidentialClient.getAuthCodeUrl(authCodeUrlParameters);
      console.log('[AzureAuth] Generated auth URL for state:', state);
      return url;
    } catch (error) {
      console.error('[AzureAuth] Error generating auth URL:', error);
      throw error;
    }
  }

  async acquireTokenByCode(code, state, nonce) {
    try {
      // Retrieve PKCE verifier
      const codeVerifier = this.pkceCache.get(state);
      if (!codeVerifier) {
        throw new Error('PKCE verifier not found for state');
      }
      
      // Clean up used verifier
      this.pkceCache.delete(state);
      
      const tokenRequest = {
        code: code,
        scopes: this.scopes,
        redirectUri: this.redirectUri,
        codeVerifier: codeVerifier,
        state: state,
        nonce: nonce
      };
      
      const response = await this.confidentialClient.acquireTokenByCode(tokenRequest);
      console.log('[AzureAuth] Token acquired successfully');
      return this.extractUserFromToken(response);
    } catch (error) {
      console.error('[AzureAuth] Error acquiring token:', error);
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