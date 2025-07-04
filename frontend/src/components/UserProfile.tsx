import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const UserProfile: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-lg p-4 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-2">User Profile</h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-white/60">Name:</span>
          <span className="ml-2 text-white">{user.name}</span>
        </div>
        <div>
          <span className="text-white/60">Email:</span>
          <span className="ml-2 text-white">{user.email}</span>
        </div>
        {user.groups && user.groups.length > 0 && (
          <div>
            <span className="text-white/60">Groups:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {user.groups.map((group, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-500/20 text-blue-200 rounded"
                >
                  {group}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};