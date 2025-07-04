import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Welcome to ChatSG</h1>
        <p className="text-white/70 mb-8 text-center">
          Please sign in with your organizational account to continue
        </p>
        <button
          onClick={login}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
        >
          Sign in with Azure AD
        </button>
        <p className="text-white/50 text-sm mt-4 text-center">
          By signing in, you agree to our terms of service and privacy policy
        </p>
      </div>
    </div>
  );
};