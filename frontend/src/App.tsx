import React, { useState, useEffect } from 'react';
import { ChatUI } from './components/ChatUI';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatManagerProvider, useChatManager } from './hooks/useChatManager';
import { ChatSettingsProvider } from './hooks/useChatSettings';
import { contentValidator } from './security/ContentValidator';

// Inner component that has access to ChatManager context
function AppContent() {
  const { activeChatId } = useChatManager();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background using CSS custom properties */}
      <div className="absolute inset-0 theme-bg"></div>
      
      {/* Animated floating orbs using CSS custom properties */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 theme-orb-1 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 theme-orb-2 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 theme-orb-3 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="relative z-50 backdrop-blur-xl bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              {/* Left side - Hamburger menu + StartGuides Logo and ChatSG */}
              <div className="flex items-center space-x-4">
                {/* Hamburger menu button for mobile */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-200"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-5 h-5 theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {/* StartGuides Company Logo */}
                <div className="flex items-center">
                  <div className="relative">
                    {/* Logo image - will show when file is added */}
                    <img 
                      src="/transpartrent_ SG.png" 
                      alt="StartGuides" 
                      className="h-24 w-auto object-cover"
                      style={{ 
                        clipPath: 'inset(25% 0 25% 0)'
                      }}
                      onError={(e) => {
                        // Hide image if file doesn't exist and show text fallback
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />
                    {/* Text fallback when image is not available */}
                    <div className="hidden">
                      <span className="text-lg font-bold theme-text-primary">StartGuides</span>
                      <span className="text-lg font-bold text-orange-500 ml-1">▷</span>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="w-px h-6 bg-white/20 dark:bg-white/10"></div>

                {/* ChatSG Application */}
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
              </div>

              {/* Right side - Theme Switcher */}
              <ThemeSwitcher />
            </div>
          </div>
        </header>

        {/* Main content with sidebar */}
        <main className="flex-1 flex">
          {/* Sidebar */}
          <ChatSidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
          
          {/* Chat container */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {activeChatId ? (
              <div className="w-full max-w-4xl h-[calc(100vh-200px)]">
                <ChatUI />
              </div>
            ) : (
              <div className="text-center">
                <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-2xl p-8 border border-white/20 dark:border-white/10">
                  <svg className="w-16 h-16 mx-auto mb-4 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h2 className="text-xl font-semibold theme-text-primary mb-2">No Chat Selected</h2>
                  <p className="theme-text-secondary mb-4">Click "New Chat" to start a conversation</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer with company branding */}
        <footer className="backdrop-blur-xl bg-white/5 dark:bg-black/5 border-t border-white/10 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center">
              <p className="text-xs theme-text-secondary">
                Powered by <span className="font-semibold theme-text-primary">StartGuides</span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
    </ChatSettingsProvider>
  );
}

function App() {
  return (
    <ChatManagerProvider>
      <AppContent />
    </ChatManagerProvider>
  );
}

export default App;
