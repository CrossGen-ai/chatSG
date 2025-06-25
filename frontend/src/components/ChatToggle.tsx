import React from 'react';
import clsx from 'clsx';

interface ChatToggleProps {
  label: string;
  description?: string;
  icon: string;
  enabled: boolean;
  loading?: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({
  label,
  description,
  icon,
  enabled,
  loading = false,
  onChange,
  className
}) => {
  const handleToggle = () => {
    if (!loading) {
      onChange(!enabled);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={clsx(
        'flex items-center space-x-3 px-3 py-2 rounded-xl backdrop-blur-md border transition-all duration-200 shadow-lg hover:shadow-xl',
        enabled
          ? 'bg-blue-500/20 border-blue-400/30 text-blue-700 dark:text-blue-300'
          : 'bg-white/20 dark:bg-black/20 border-white/30 dark:border-white/10 text-gray-700 dark:text-gray-300',
        loading 
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-white/30 dark:hover:bg-black/30 cursor-pointer',
        className
      )}
    >
      {/* Icon */}
      <div className={clsx(
        'w-6 h-6 rounded-lg flex items-center justify-center text-sm transition-all duration-200',
        enabled
          ? 'bg-blue-500 text-white shadow-md'
          : 'bg-gray-400 dark:bg-gray-600 text-white'
      )}>
        {loading ? (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          icon
        )}
      </div>

      {/* Label and description */}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs opacity-75">{description}</div>
        )}
      </div>

      {/* Toggle indicator */}
      <div className={clsx(
        'w-10 h-6 rounded-full relative transition-all duration-200 shadow-inner',
        enabled
          ? 'bg-blue-500'
          : 'bg-gray-300 dark:bg-gray-600'
      )}>
        <div className={clsx(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200',
          enabled ? 'left-5' : 'left-1'
        )} />
      </div>
    </button>
  );
};

 