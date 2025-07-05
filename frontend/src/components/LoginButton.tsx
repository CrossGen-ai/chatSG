import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserDropdown } from './UserDropdown';

export const LoginButton: React.FC = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return (
      <UserDropdown
        username={user.name || 'User'}
        email={user.email || 'user@example.com'}
        avatarUrl={user.picture}
        onLogout={logout}
      />
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