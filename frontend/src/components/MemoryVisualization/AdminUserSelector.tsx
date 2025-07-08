import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Search, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
  azureId: string;
  lastLogin?: string;
}

interface AdminUserSelectorProps {
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
  currentUserId: string;
}

export const AdminUserSelector: React.FC<AdminUserSelectorProps> = ({
  selectedUserId,
  onUserSelect,
  currentUserId
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/memory/users', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`);
        }

        const data = await response.json();
        setUsers(data.data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected user
  const selectedUser = users.find(user => user.id === selectedUserId);

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    onUserSelect(userId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Format last login date
  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Check if user is admin
  const isAdmin = (user: User) => user.groups.includes('admin');

  if (loading) {
    return (
      <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/5">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="w-4 h-4 theme-text-secondary" />
          <span className="text-sm font-medium theme-text-primary">User Selection</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-primary"></div>
          <span className="ml-2 text-sm theme-text-secondary">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/5">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="w-4 h-4 theme-text-secondary" />
          <span className="text-sm font-medium theme-text-primary">User Selection</span>
        </div>
        <div className="p-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Error loading users</span>
          </div>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/5">
      <div className="flex items-center space-x-2 mb-3">
        <Users className="w-4 h-4 theme-text-secondary" />
        <span className="text-sm font-medium theme-text-primary">User Selection</span>
        <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
          Admin
        </div>
      </div>

      <div className="relative">
        {/* Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center">
              <User className="w-4 h-4 theme-text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium theme-text-primary">
                {selectedUser ? selectedUser.name : 'Select User'}
              </div>
              <div className="text-xs theme-text-secondary">
                {selectedUser ? selectedUser.email : 'Choose a user to view their memories'}
              </div>
            </div>
          </div>
          <ChevronDown 
            className={`w-4 h-4 theme-text-secondary transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-white/20 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-text-secondary" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 theme-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                />
              </div>
            </div>

            {/* User List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm theme-text-secondary">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-white/10 dark:hover:bg-black/10 transition-colors ${
                      user.id === selectedUserId ? 'bg-white/20 dark:bg-black/20' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center">
                      <User className="w-4 h-4 theme-text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium theme-text-primary truncate">
                          {user.name}
                        </div>
                        {user.id === currentUserId && (
                          <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                            You
                          </div>
                        )}
                        {isAdmin(user) && (
                          <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                            Admin
                          </div>
                        )}
                      </div>
                      <div className="text-xs theme-text-secondary truncate">
                        {user.email}
                      </div>
                      <div className="text-xs theme-text-secondary">
                        Last login: {formatLastLogin(user.lastLogin)}
                      </div>
                    </div>
                    {user.id === selectedUserId && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected User Info */}
      {selectedUser && (
        <div className="mt-3 p-3 rounded-lg bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="text-xs theme-text-secondary">
              Viewing memories for:
            </div>
            <div className="flex items-center space-x-2">
              {selectedUser.id === currentUserId && (
                <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                  Your memories
                </div>
              )}
              {isAdmin(selectedUser) && (
                <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                  Admin user
                </div>
              )}
            </div>
          </div>
          <div className="mt-1 text-sm font-medium theme-text-primary">
            {selectedUser.name}
          </div>
          <div className="text-xs theme-text-secondary">
            {selectedUser.email}
          </div>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};