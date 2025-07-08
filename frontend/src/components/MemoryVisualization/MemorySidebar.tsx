import React from 'react';
import { Brain, Pin, ChevronLeft } from 'lucide-react';
import { MemoryTypeSelector } from './MemoryTypeSelector';
import { AdminUserSelector } from './AdminUserSelector';

export type MemoryType = 'short-term' | 'semantic' | 'long-term';

interface MemorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  userRole: 'admin' | 'user';
  currentUserId: string;
  activeMemoryType: MemoryType;
  onMemoryTypeChange: (type: MemoryType) => void;
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
}

export const MemorySidebar: React.FC<MemorySidebarProps> = ({
  isOpen,
  onClose,
  isPinned,
  onTogglePin,
  userRole,
  currentUserId,
  activeMemoryType,
  onMemoryTypeChange,
  selectedUserId,
  onUserSelect
}) => {
  return (
    <div className={`
      ${isPinned ? 'relative' : 'fixed left-0 top-0'}
      h-full w-96 z-30 transition-transform duration-300 ease-in-out
      ${isPinned ? '' : isOpen ? 'translate-x-[60px]' : '-translate-x-full'}
    `}>
      <div className="h-full backdrop-blur-xl bg-white/10 dark:bg-black/10 border-r border-white/20 dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {/* Collapse button */}
              <button
                onClick={isPinned ? undefined : onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isPinned 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/20 dark:hover:bg-white/10'
                }`}
                aria-label={isPinned ? "Unpin memory panel to collapse" : "Collapse memory panel"}
                title={isPinned ? "Unpin memory panel to collapse" : "Collapse memory panel"}
                disabled={isPinned}
              >
                <ChevronLeft className="w-5 h-5 theme-text-primary" />
              </button>
              
              {/* Pin/Unpin button */}
              <button
                onClick={onTogglePin}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                aria-label={isPinned ? "Unpin memory panel" : "Pin memory panel"}
                title={isPinned ? "Unpin memory panel" : "Pin memory panel"}
              >
                {isPinned ? (
                  <Pin className="w-5 h-5 theme-text-primary fill-current" />
                ) : (
                  <Pin className="w-5 h-5 theme-text-primary" />
                )}
              </button>
              
              {/* Title */}
              <h2 className="text-lg font-semibold theme-text-primary">
                Memory Navigation
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-accent-primary" />
            </div>
          </div>
        </div>
        
        {/* Admin User Selector */}
        {userRole === 'admin' && (
          <AdminUserSelector
            selectedUserId={selectedUserId}
            onUserSelect={onUserSelect}
            currentUserId={currentUserId}
          />
        )}
        
        {/* Memory Type Selector */}
        <MemoryTypeSelector
          activeType={activeMemoryType}
          onTypeChange={onMemoryTypeChange}
        />
        
        {/* Footer Info */}
        <div className="mt-auto p-3 border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/5 dark:bg-black/5">
          <div className="text-xs theme-text-secondary text-center">
            <span className="inline-flex items-center space-x-1">
              <span>Read-only visualization</span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center space-x-1">
                <Brain className="w-3 h-3" />
                <span>Mem0 Memory System</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};