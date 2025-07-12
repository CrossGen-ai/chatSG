import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { csrfManager } from '../security/CSRFManager';

interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/user', {
        withCredentials: true
      });
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      // First, ensure we have a session by making a request
      await axios.get('/api/config/security', {
        withCredentials: true
      });
      
      // Then navigate to login
      window.location.href = '/api/auth/login';
    } catch (error) {
      console.error('Login initialization error:', error);
      // Still try to navigate even if the initial request fails
      window.location.href = '/api/auth/login';
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { 
        withCredentials: true,
        headers: await csrfManager.addHeaders()
      });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};