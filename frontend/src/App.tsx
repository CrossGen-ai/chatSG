import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatUI } from './components/ChatUI';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ChatSidebar } from './components/ChatSidebar';
import { IconSidebar } from './components/IconSidebar';
import { MemorySidebar, MemoryType } from './components/MemoryVisualization/MemorySidebar';
import { MemoryVisualizationView } from './components/MemoryVisualization/MemoryVisualizationView';
import { useUIPreferences } from './hooks/useUIPreferences';
import { ChatManagerProvider, useChatManager } from './hooks/useChatManager';
import { ChatSettingsProvider } from './hooks/useChatSettings';
import { contentValidator } from './security/ContentValidator';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { LoginButton } from './components/LoginButton';
import { useAuth } from './hooks/useAuth';

// Inner component that has access to ChatManager context
function AppContent() {
  const { activeChatId } = useChatManager();
  const { preferences, updatePreference, updatePreferences } = useUIPreferences();
  const { user, isAuthenticated } = useAuth();
  const [activeMemoryType, setActiveMemoryType] = useState<MemoryType>('short-term');
  const [selectedMemoryUserId, setSelectedMemoryUserId] = useState<string>(user?.id || '');

  // Update selectedMemoryUserId when user changes
  useEffect(() => {
    if (user?.id && !selectedMemoryUserId) {
      setSelectedMemoryUserId(user.id);
    }
  }, [user, selectedMemoryUserId]);

  // Ensure contentValidator is initialized (happens automatically on first use)
  useEffect(() => {
    // Just accessing contentValidator triggers its initialization
    console.log('[App] Security validator ready');
    
    // Trigger CSRF token refresh to ensure we have a token
    contentValidator.getCSRFToken().then(token => {
      if (token) {
        console.log('[App] CSRF token available');
      } else {
        console.log('[App] No CSRF token yet - will be set on first API call');
      }
    });
  }, []);

  return (
    <ChatSettingsProvider sessionId={activeChatId}>
      <div className="h-screen relative overflow-hidden">
      {/* Animated gradient background using CSS custom properties */}
      <div className="absolute inset-0 theme-bg"></div>
      
      {/* Animated floating orbs using CSS custom properties */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 theme-orb-1 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 theme-orb-2 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 theme-orb-3 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Icon Sidebar */}
      <IconSidebar 
        onOpenSidebar={() => {
          updatePreferences({
            sidebarOpen: true,
            memoryPanelOpen: false,
            currentView: 'chat'
          });
        }} 
        onOpenMemoryPanel={() => {
          updatePreferences({
            memoryPanelOpen: true,
            sidebarOpen: false,
            currentView: 'memory'
          });
        }}
        currentView={preferences.currentView}
        onViewChange={(view) => updatePreference('currentView', view)}
      />
      
      {/* Main content */}
      <div className={`relative z-10 h-screen flex flex-col ${
        (preferences.currentView === 'chat' && preferences.sidebarOpen && preferences.sidebarPinned) ||
        (preferences.currentView === 'memory' && preferences.memoryPanelOpen && preferences.memoryPanelPinned)
          ? 'ml-[440px]' 
          : 'ml-[60px]'
      }`}>
          {/* Header */}
          <header className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <div className="flex items-center justify-between">
                {/* Center - ChatSG Application */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 theme-accent rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold theme-text-primary">
                      ChatSG
                    </h1>
                    <p className="text-xs theme-text-secondary">AI-Powered Conversations</p>
                  </div>
                </div>

                {/* Right side - Login Button + Theme Switcher */}
                <div className="flex items-center space-x-4">
                  <LoginButton />
                  <ThemeSwitcher />
                </div>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 flex overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full h-full">
              <div className="h-full flex flex-col">
                {preferences.currentView === 'chat' ? (
                  activeChatId ? (
                    <ChatUI />
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-2xl p-8 border border-white/20 dark:border-white/10">
                        <svg className="w-16 h-16 mx-auto mb-4 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h2 className="text-xl font-semibold theme-text-primary mb-2">No Chat Selected</h2>
                        <p className="theme-text-secondary mb-4">Click "New Chat" to start a conversation</p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <MemoryVisualizationView 
                    activeMemoryType={activeMemoryType}
                    selectedUserId={selectedMemoryUserId || user?.id || ''}
                  />
                )}
              </div>
            </div>
          </main>

          {/* Footer with company branding */}
          <footer className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border-t border-white/10 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-center space-x-6">
                {/* StartGuides Logo */}
                <div className="flex items-center">
                  <img 
                    src="/transpartrent_ SG.png" 
                    alt="StartGuides" 
                    className="h-16 w-auto object-cover"
                    style={{ 
                      clipPath: 'inset(25% 0 25% 0)'
                    }}
                    onError={(e) => {
                      // Hide image if file doesn't exist and show text fallback
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                  {/* Text fallback when image is not available */}
                  <div className="hidden items-center">
                    <span className="text-sm font-bold theme-text-primary">StartGuides</span>
                    <span className="text-sm font-bold text-orange-500 ml-1">▷</span>
                  </div>
                </div>
                
                {/* Powered by text */}
                <p className="text-xs theme-text-secondary">
                  Powered by <span className="font-semibold theme-text-primary">StartGuides</span>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
      
      {/* Chat Sidebar - only show when in chat view */}
      {preferences.currentView === 'chat' && (
        <div className={`${preferences.sidebarPinned ? 'fixed left-[60px] top-0' : ''}`}>
          <ChatSidebar 
            isOpen={preferences.sidebarOpen} 
            onClose={() => updatePreference('sidebarOpen', false)}
            isPinned={preferences.sidebarPinned}
            onTogglePin={() => updatePreference('sidebarPinned', !preferences.sidebarPinned)}
          />
        </div>
      )}
      
      {/* Memory Sidebar - only show when in memory view */}
      {preferences.currentView === 'memory' && (
        <div className={`${preferences.memoryPanelPinned ? 'fixed left-[60px] top-0' : ''}`}>
          <MemorySidebar 
            isOpen={preferences.memoryPanelOpen} 
            onClose={() => updatePreference('memoryPanelOpen', false)}
            isPinned={preferences.memoryPanelPinned}
            onTogglePin={() => updatePreference('memoryPanelPinned', !preferences.memoryPanelPinned)}
            userRole={user?.groups?.includes('admin') ? 'admin' : 'user'}
            currentUserId={user?.id || ''}
            activeMemoryType={activeMemoryType}
            onMemoryTypeChange={setActiveMemoryType}
            selectedUserId={selectedMemoryUserId || user?.id || ''}
            onUserSelect={setSelectedMemoryUserId}
          />
        </div>
      )}
    </ChatSettingsProvider>
  );
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  // For now, allow access even if not authenticated (for development)
  // To require auth, change this to: return isAuthenticated ? children : <Navigate to="/login" />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<Navigate to="/login" />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <ChatManagerProvider>
                  <AppContent />
                </ChatManagerProvider>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
