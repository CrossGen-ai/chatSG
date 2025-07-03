import React from 'react';
import clsx from 'clsx';

export interface StatusMessageProps {
  type: string;
  message: string;
  metadata?: any;
  timestamp?: Date;
}

const statusTypeConfig: Record<string, { icon: string; className: string; label: string }> = {
  memory_saved: {
    icon: '💾',
    className: 'bg-purple-500/10 border-purple-400/30 text-purple-700 dark:text-purple-300',
    label: 'Memory Saved'
  },
  context_retrieved: {
    icon: '🔍',
    className: 'bg-blue-500/10 border-blue-400/30 text-blue-700 dark:text-blue-300',
    label: 'Context Retrieved'
  },
  tool_executed: {
    icon: '🔧',
    className: 'bg-green-500/10 border-green-400/30 text-green-700 dark:text-green-300',
    label: 'Tool Executed'
  },
  agent_handoff: {
    icon: '🤝',
    className: 'bg-orange-500/10 border-orange-400/30 text-orange-700 dark:text-orange-300',
    label: 'Agent Handoff'
  },
  processing: {
    icon: '⚙️',
    className: 'bg-gray-500/10 border-gray-400/30 text-gray-700 dark:text-gray-300',
    label: 'Processing'
  },
  default: {
    icon: 'ℹ️',
    className: 'bg-gray-500/10 border-gray-400/30 text-gray-700 dark:text-gray-300',
    label: 'Status'
  }
};

export const StatusMessage: React.FC<StatusMessageProps> = ({ 
  type, 
  message, 
  metadata,
  timestamp = new Date()
}) => {
  const config = statusTypeConfig[type] || statusTypeConfig.default;
  
  return (
    <div className="flex justify-center my-2">
      <div 
        className={clsx(
          'inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium',
          'backdrop-blur-md border shadow-sm transition-all duration-300',
          config.className
        )}
      >
        <span role="img" aria-label={config.label}>{config.icon}</span>
        <span>{message}</span>
        {metadata?.details && (
          <span className="opacity-75 italic">({metadata.details})</span>
        )}
      </div>
    </div>
  );
};

export default StatusMessage;