// TypeScript interfaces for authentication

export interface User {
  id: string;
  azureId: string;
  email: string;
  name: string;
  groups: string[];
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  groups: string[];
  azureId: string;
}

export interface AuthState {
  state: string;
  nonce: string;
  codeVerifier?: string;
  codeChallenge?: string;
}

export interface MSALConfig {
  clientId: string;
  clientSecret: string;
  authority: string;
  redirectUri: string;
}

export interface TokenResponse {
  accessToken: string;
  idToken: string;
  expiresOn: Date;
  account: any;
  idTokenClaims: {
    oid: string;
    email?: string;
    preferred_username?: string;
    name?: string;
    groups?: string[];
    [key: string]: any;
  };
}

// Express session augmentation
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    authState?: AuthState;
  }
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser | null;
      isAuthenticated?: boolean;
    }
  }
}