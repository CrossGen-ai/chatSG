import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const LoginButton: React.FC = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/70">{user.name || user.email}</span>
        <button
          onClick={logout}
          className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm border border-white/10"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 rounded-lg transition-colors backdrop-blur-sm border border-blue-500/30"
    >
      Login with Azure AD
    </button>
  );
};