import React from 'react';
import clsx from 'clsx';
import { HybridMessage } from '../hooks/useChatManager';
import { AgentAvatarService } from '../services/AgentAvatarService';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageItemProps {
  message: HybridMessage;
  currentChatAgentType?: string;
  showAnimation?: boolean;
  index?: number;
}

interface BotAvatarProps {
  agentType?: string;
  className?: string;
  showTooltip?: boolean;
}

const BotAvatar: React.FC<BotAvatarProps> = ({ agentType, className, showTooltip = true }) => {
  const avatarConfig = AgentAvatarService.getAvatarConfig(agentType);
  
  // Determine if we should use theme accent or specific gradient
  const isThemeAccent = avatarConfig.gradient === 'theme-accent';
  const backgroundClass = isThemeAccent 
    ? 'theme-accent' 
    : `bg-gradient-to-r ${avatarConfig.gradient}`;

  return (
    <div 
      className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 transition-all duration-300',
        backgroundClass,
        className
      )}
      title={showTooltip ? `${avatarConfig.name}: ${avatarConfig.description}` : undefined}
    >
      {/* Use emoji for better visual appeal */}
      <span className="text-lg" role="img" aria-label={avatarConfig.name}>
        {avatarConfig.emoji}
      </span>
    </div>
  );
};

const UserAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
);

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const MessageItem = React.memo<MessageItemProps>(({ 
  message, 
  currentChatAgentType,
  showAnimation = false,
  index = 0
}) => {
  const animationClass = showAnimation ? 'animate-in slide-in-from-bottom-2 duration-300' : '';
  const animationStyle = showAnimation ? { animationDelay: `${Math.min(index * 50, 500)}ms` } : {};

  return (
    <div
      className={clsx(
        'flex items-end space-x-2',
        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        animationClass
      )}
      style={animationStyle}
    >
      {message.sender === 'user' ? <UserAvatar /> : <BotAvatar agentType={message.agent || currentChatAgentType} />}
      <div className={clsx(
        message.sender === 'user' 
          ? 'max-w-xs lg:max-w-md xl:max-w-lg order-1' 
          : 'flex-1 order-2'
      )}>
        <div
          className={clsx(
            'px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md border transition-all duration-200 hover:shadow-xl',
            message.sender === 'user'
              ? 'theme-accent text-white rounded-br-md border-blue-400/30 inline-block'
              : 'bg-white/60 dark:bg-black/40 theme-text-primary rounded-bl-md border-white/20 w-full'
          )}
        >
          {message.content && !message.isStreaming ? (
            // Show content for non-streaming messages with markdown
            <MarkdownRenderer 
              content={message.content} 
              isStreaming={false}
              className="text-sm leading-relaxed w-full"
              darkMode={document.documentElement.classList.contains('dark')}
            />
          ) : message.isStreaming && message.content && message.content.trim() ? (
            // Show content with progressive markdown for streaming messages
            <MarkdownRenderer 
              content={message.content} 
              isStreaming={true}
              className="text-sm leading-relaxed w-full"
              darkMode={document.documentElement.classList.contains('dark')}
            />
          ) : (
            // Show typing indicator for empty bot messages (streaming or loading) or streaming with only whitespace
            message.sender === 'bot' && (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            )
          )}
        </div>
        <div className={clsx(
          'mt-1 text-xs theme-text-secondary',
          message.sender === 'user' ? 'text-right' : 'text-left'
        )}>
          {formatTime(message.timestamp)}
          {/* Show sync status for debugging */}
          {!message.synced && (
            <span className="ml-2 text-orange-500">•</span>
          )}
          {/* Show memory status for bot messages */}
          {message.sender === 'bot' && message.memoryStatus && (
            <span className="ml-2">
              {message.memoryStatus.status === 'loaded' && message.memoryStatus.memoryCount > 0 && (
                <span className="text-blue-500" title={`${message.memoryStatus.memoryCount} memories loaded in ${message.memoryStatus.retrievalTime}ms`}>
                  🧠{message.memoryStatus.memoryCount}
                </span>
              )}
              {message.memoryStatus.status === 'timeout' && (
                <span className="text-orange-500" title={`Memory retrieval timed out after ${message.memoryStatus.retrievalTime}ms`}>
                  🧠⏱️
                </span>
              )}
              {message.memoryStatus.status === 'empty' && message.memoryStatus.enabled && (
                <span className="text-gray-500" title="No relevant memories found">
                  🧠∅
                </span>
              )}
              {message.memoryStatus.status === 'error' && (
                <span className="text-red-500" title={`Memory error: ${message.memoryStatus.errorMessage || 'Unknown error'}`}>
                  🧠❌
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these specific props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.synced === nextProps.message.synced &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    JSON.stringify(prevProps.message.memoryStatus) === JSON.stringify(nextProps.message.memoryStatus) &&
    prevProps.currentChatAgentType === nextProps.currentChatAgentType &&
    prevProps.showAnimation === nextProps.showAnimation
  );
});

MessageItem.displayName = 'MessageItem';