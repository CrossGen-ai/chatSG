import React from 'react';

interface IconSidebarProps {
  onOpenSidebar: () => void;
}

export const IconSidebar: React.FC<IconSidebarProps> = ({ onOpenSidebar }) => {
  return (
    <div className="fixed left-0 top-0 h-screen w-[60px] z-50 backdrop-blur-xl bg-black/20 dark:bg-black/40 border-r border-white/20 dark:border-white/10 flex flex-col items-center py-4">
      {/* Chat icon button */}
      <button
        onClick={onOpenSidebar}
        className="w-10 h-10 rounded-lg backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200 flex items-center justify-center group"
        aria-label="Open chat sidebar"
        title="Open chats"
      >
        <svg 
          className="w-6 h-6 theme-text-primary group-hover:scale-110 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
      </button>
      
      {/* Add more icon buttons here in the future */}
    </div>
  );
};