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

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthState {
  state: string;
  nonce: string;
  codeVerifier?: string;
  codeChallenge?: string;
}

export interface TokenResponse {
  accessToken: string;
  idToken: string;
  expiresOn: Date;
  account: {
    username: string;
    name?: string;
    localAccountId: string;
  };
  idTokenClaims: {
    oid: string;
    email?: string;
    preferred_username?: string;
    name?: string;
    groups?: string[];
    [key: string]: any;
  };
}

import { Request } from 'express';

declare module 'express-session' {
  interface SessionData {
    user?: User;
    authState?: AuthState;
  }
}

export interface AuthRequest extends Request {
  user?: User;
  isAuthenticated?: boolean;
}