import React from 'react';
import { X, Pin } from 'lucide-react';

interface PerformanceSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

export const PerformanceSidebar: React.FC<PerformanceSidebarProps> = ({
  isOpen,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile and unpinned state */}
      {!isPinned && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed top-0 h-screen w-[380px] backdrop-blur-xl bg-white/30 dark:bg-black/30 border-r border-white/20 dark:border-white/10 transition-all duration-300 z-40 ${
          isPinned ? 'left-[60px]' : 'left-[60px]'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10">
            <h2 className="text-lg font-semibold theme-text-primary">Performance Dashboard</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePin}
                className={`p-1.5 rounded-lg backdrop-blur-md border transition-colors ${
                  isPinned
                    ? 'bg-accent-primary/20 border-accent-primary/50 theme-text-accent'
                    : 'bg-white/20 dark:bg-white/10 border-white/30 dark:border-white/10 theme-text-secondary hover:theme-text-primary'
                }`}
                title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
              >
                <Pin size={16} className={isPinned ? 'rotate-0' : '-rotate-45'} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/10 theme-text-secondary hover:theme-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Performance Panel Option */}
            <div className="backdrop-blur-md bg-white/20 dark:bg-white/10 rounded-lg p-4 border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/20 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium theme-text-primary">Performance Metrics</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Active
                </span>
              </div>
              <p className="text-sm theme-text-secondary">
                View real-time performance metrics, bottlenecks, and system health indicators.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="backdrop-blur-md bg-white/10 dark:bg-black/10 rounded px-2 py-1">
                  <span className="theme-text-secondary">Response Time</span>
                  <span className="theme-text-primary ml-1">~850ms</span>
                </div>
                <div className="backdrop-blur-md bg-white/10 dark:bg-black/10 rounded px-2 py-1">
                  <span className="theme-text-secondary">Operations</span>
                  <span className="theme-text-primary ml-1">1.2k</span>
                </div>
              </div>
            </div>

            {/* Future options can be added here */}
            <div className="mt-4 p-4 backdrop-blur-md bg-white/10 dark:bg-black/10 rounded-lg border border-white/20 dark:border-white/10">
              <p className="text-sm theme-text-secondary text-center">
                More performance tools coming soon...
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/20 dark:border-white/10">
            <div className="text-xs theme-text-secondary">
              Performance monitoring is {' '}
              <span className="text-green-400">enabled</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};