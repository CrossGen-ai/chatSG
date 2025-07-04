import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // The backend handles the actual callback and redirects to frontend
    // This component is here in case we need to handle client-side logic
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');
    
    if (error) {
      console.error('Authentication error:', error);
      navigate('/login');
    } else {
      // Successful auth, redirect to home
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-white mt-4">Completing authentication...</p>
      </div>
    </div>
  );
};