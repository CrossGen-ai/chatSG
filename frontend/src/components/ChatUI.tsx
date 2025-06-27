import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { sendChatMessage, ChatResponse, markChatAsRead } from '../api/chat';
import { useChatManager, HybridMessage } from '../hooks/useChatManager';
import { ChatSettingsProvider } from '../hooks/useChatSettings';
import { ChatSettingsToggles } from './ChatSettingsToggles';
import { AgentAvatarService, AgentAvatarConfig } from '../services/AgentAvatarService';
import { useChatSettings } from '../hooks/useChatSettings';
import { SlashCommandInput } from './SlashCommandInput';
import { SlashCommand } from '../hooks/useSlashCommands';
import { MessageSkeleton } from './SkeletonLoader';

interface ChatUIProps {
  sessionId?: string;
}

const initialMessages: HybridMessage[] = [
  { 
    id: 1, 
    content: 'Hello! I\'m your AI assistant. How can I help you today? Feel free to ask me anything!', 
    sender: 'bot',
    timestamp: new Date(),
    synced: false
  },
];

interface BotAvatarProps {
  agentType?: string;
  className?: string;
  showTooltip?: boolean;
}

const BotAvatar: React.FC<BotAvatarProps> = ({ agentType, className, showTooltip = true }) => {
  const avatarConfig = AgentAvatarService.getAvatarConfig(agentType);
  const iconPath = AgentAvatarService.getIconPath(avatarConfig.icon);
  
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
      {/* Use emoji for better visual appeal, fallback to SVG icon */}
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

interface TypingIndicatorProps {
  agentType?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ agentType }) => (
  <div className="flex items-center space-x-2 p-4">
    <BotAvatar agentType={agentType} />
    <div className="backdrop-blur-md bg-white/60 dark:bg-black/40 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-white/20 dark:border-white/10">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  </div>
);

const RemoteLoadingIndicator = () => (
  <div className="flex items-center justify-center p-2">
    <div className="backdrop-blur-md bg-blue-500/20 dark:bg-blue-400/20 rounded-2xl px-4 py-2 shadow-lg border border-blue-400/30">
      <div className="flex items-center space-x-2">
        <svg className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          Loading messages from remote...
        </span>
      </div>
    </div>
  </div>
);

interface CrossSessionMemoryIndicatorProps {
  isEnabled: boolean;
  className?: string;
}

const CrossSessionMemoryIndicator: React.FC<CrossSessionMemoryIndicatorProps> = ({ 
  isEnabled, 
  className 
}) => {
  if (!isEnabled) return null;

  return (
    <div 
      className={clsx(
        'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300',
        'backdrop-blur-md border shadow-sm',
        'bg-purple-500/10 border-purple-400/30 text-purple-700 dark:text-purple-300',
        className
      )}
      title="Cross-session memory is enabled - I can remember context from previous conversations"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Cross-session memory</span>
    </div>
  );
};

interface AgentIndicatorProps {
  agentType?: string;
  className?: string;
}

const AgentIndicator: React.FC<AgentIndicatorProps> = ({ agentType, className }) => {
  const avatarConfig = AgentAvatarService.getAvatarConfig(agentType);
  const themeColors = AgentAvatarService.getThemeColors(agentType);
  
  if (!agentType || agentType === 'default') {
    return null;
  }

  return (
    <div 
      className={clsx(
        'flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
        'backdrop-blur-md border shadow-sm',
        className
      )}
      style={{
        backgroundColor: themeColors.background,
        borderColor: themeColors.primary + '30',
        color: themeColors.text
      }}
    >
      <span className="text-xs" role="img" aria-label={avatarConfig.name}>
        {avatarConfig.emoji}
      </span>
      <span className="text-xs font-medium">{avatarConfig.name}</span>
    </div>
  );
};

export const ChatUI: React.FC<ChatUIProps> = ({ sessionId }) => {
  const { activeChatId, updateChatMetadata, chats, setChatLoading, markChatNewMessage, getChatMessages, getCachedMessages, saveChatMessage, trackAgentUsage } = useChatManager();
  const { settings } = useChatSettings();
  // Use activeChatId directly, with sessionId prop as override if provided
  const effectiveActiveChatId = sessionId || activeChatId;
  const currentChat = chats.find(chat => chat.id === effectiveActiveChatId);
  
  // Create a ref to track the current active chat ID for async operations
  // 🚨 CRITICAL: DO NOT REMOVE - Required for race condition fix
  // Without this useEffect, the ref becomes stale and race condition returns
  // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
  const activeChatIdRef = useRef(effectiveActiveChatId);
  
  const [messages, setMessages] = useState<HybridMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoadingRemoteMessages, setIsLoadingRemoteMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingRequests, setPendingRequests] = useState<Map<string, AbortController>>(new Map());

  // Remove global loading state, use per-chat loading from context
  const loading = currentChat?.isLoading || false;

  // Enhanced progressive message loading
  const loadMessagesProgressively = async (sessionId: string): Promise<HybridMessage[]> => {
    if (!sessionId) return initialMessages;
    
    try {
      console.log(`[ChatUI] Starting progressive loading for session: ${sessionId}`);
      setIsLoadingRemoteMessages(true);
      
      const messages = await getChatMessages(sessionId);
      
      setIsLoadingRemoteMessages(false);
      
      const finalMessages = messages.length > 0 ? messages : initialMessages;
      console.log(`[ChatUI] Progressive loading completed: ${finalMessages.length} messages for session: ${sessionId}`);
      return finalMessages;
    } catch (error) {
      console.warn('Failed to load messages progressively:', error);
      setIsLoadingRemoteMessages(false);
      return initialMessages;
    }
  };

  // Load messages when sessionId changes - now with progressive loading
  useEffect(() => {
    console.log(`[ChatUI] useEffect: Loading messages for session change: ${effectiveActiveChatId}`);
    if (effectiveActiveChatId) {
      loadMessagesProgressively(effectiveActiveChatId).then(loadedMessages => {
        setMessages(loadedMessages);
        console.log(`[ChatUI] useEffect: Loaded ${loadedMessages.length} messages for session: ${effectiveActiveChatId}`);
      });
    }
  }, [effectiveActiveChatId]);

  // Monitor chat loading state and update local loading indicator
  useEffect(() => {
    if (currentChat) {
      setIsLoadingRemoteMessages(currentChat.isLoadingMessages);
      console.log(`[ChatUI] Updated loading state for session ${effectiveActiveChatId}: ${currentChat.isLoadingMessages}`);
    }
  }, [currentChat?.isLoadingMessages, effectiveActiveChatId]);

  // Listen for message updates from progressive loading
  useEffect(() => {
    if (effectiveActiveChatId && !isLoadingRemoteMessages) {
      // Check for updated messages periodically when not loading
      const interval = setInterval(() => {
        const currentMessages = getCachedMessages(effectiveActiveChatId);
        if (currentMessages.length !== messages.length) {
          console.log(`[ChatUI] Detected message updates from background sync for session: ${effectiveActiveChatId}`);
          setMessages(currentMessages.length > 0 ? currentMessages : initialMessages);
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [effectiveActiveChatId, isLoadingRemoteMessages, messages.length, getCachedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update the ref whenever effectiveActiveChatId changes
  // 🚨 CRITICAL: DO NOT REMOVE - Required for race condition fix
  // Without this useEffect, the ref becomes stale and race condition returns
  // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
  useEffect(() => {
    activeChatIdRef.current = effectiveActiveChatId;
    console.log(`[ChatUI] 🔄 Updated activeChatIdRef to: ${effectiveActiveChatId}`);
  }, [effectiveActiveChatId]);

  // REMOVED: Request cancellation useEffect for background processing

  const sendMessage = async () => {
    if (!input.trim() || loading || !effectiveActiveChatId) return;
    
    // CRITICAL FIX: Capture originating session as a STATIC VALUE
    // This prevents the value from changing when user switches chats
    const originatingSessionId = String(effectiveActiveChatId);
    console.log(`[ChatUI] 🚀 SENDING MESSAGE - originatingSessionId: ${originatingSessionId}, effectiveActiveChatId: ${effectiveActiveChatId}`);
    
    const requestId = crypto.randomUUID();
    const abortController = new AbortController();
    
    // Track request
    setPendingRequests(prev => new Map(prev).set(requestId, abortController));
    
    // Set loading state for this specific chat
    setChatLoading(originatingSessionId, true);
    
    const userMessage: HybridMessage = {
      id: Date.now(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      synced: false
    };
    
    // CRITICAL FIX: Save user message immediately to hybrid storage
    // 🚨 CRITICAL: DO NOT REMOVE - Prevents cross-chat message contamination
    // This prevents cross-chat contamination when users switch chats quickly
    // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
    saveChatMessage(originatingSessionId, userMessage);
    console.log(`[ChatUI] User message immediately saved to hybrid storage for session: ${originatingSessionId}`);
    
    // Update current UI with the user message
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    
    try {
      const chatResponse = await sendChatMessage(currentInput, originatingSessionId, {
        signal: abortController.signal,
        activeSessionId: activeChatIdRef.current
      });
      
      // CRITICAL FIX: Use the ref to get the ACTUAL current session at response time
      // 🚨 CRITICAL: DO NOT CHANGE - Must use activeChatIdRef.current, not effectiveActiveChatId
      // Using effectiveActiveChatId here will cause race condition to return
      // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
      console.log(`[ChatUI] 📥 RESPONSE RECEIVED - originatingSessionId: ${originatingSessionId}, activeChatId at response time: ${activeChatIdRef.current}`);
      console.log(`[ChatUI] 🔍 Session validation: ${originatingSessionId} === ${activeChatIdRef.current} ? ${originatingSessionId === activeChatIdRef.current}`);
      console.log(`[ChatUI] 🔍 DETAILED COMPARISON:`);
      console.log(`[ChatUI] 🔍   - originatingSessionId: "${originatingSessionId}" (length: ${originatingSessionId.length}, type: ${typeof originatingSessionId})`);
      console.log(`[ChatUI] 🔍   - activeChatIdRef.current: "${activeChatIdRef.current}" (length: ${String(activeChatIdRef.current).length}, type: ${typeof activeChatIdRef.current})`);
      console.log(`[ChatUI] 🔍   - sessionId prop: "${sessionId}"`);
      console.log(`[ChatUI] 🤖 Agent information:`, { agent: chatResponse.agent, backend: chatResponse.backend });
      
      // Track agent usage if agent information is available
      if (chatResponse.agent) {
        trackAgentUsage(originatingSessionId, chatResponse.agent);
      }
      
      // Session validation before UI update
      if (originatingSessionId === activeChatIdRef.current) {
        console.log(`[ChatUI] ✅ ACTIVE CHAT PATH - Adding response to current UI`);
        // Response for currently active chat
        const botMessage: HybridMessage = {
          id: Date.now() + 1,
          content: chatResponse.message,
          sender: 'bot',
          timestamp: new Date(),
          agent: chatResponse.agent, // Include agent information
          synced: false
        };
        
        // Save to hybrid storage
        saveChatMessage(originatingSessionId, botMessage);
        
        // Update UI
        setMessages((msgs) => {
          const newMessages = [...msgs, botMessage];
          console.log(`[ChatUI] ✅ ACTIVE: Updated UI with ${newMessages.length} messages for session: ${originatingSessionId}`);
          return newMessages;
        });
        console.log(`[ChatUI] Message delivered to active session: ${originatingSessionId}`);
        
        // Update message count for active chat
        markChatNewMessage(originatingSessionId, true, activeChatIdRef.current); // Pass current active ID
        
        // Mark as read immediately since we're viewing this chat
        try {
          await markChatAsRead(originatingSessionId);
          console.log(`[ChatUI] Marked active session as read: ${originatingSessionId}`);
        } catch (error) {
          console.error(`[ChatUI] Failed to mark active session as read:`, error);
        }
      } else {
        console.log(`[ChatUI] 🔄 BACKGROUND CHAT PATH - Saving response to hybrid storage only`);
        // Response for background chat - mark as having new messages
        const botMessage: HybridMessage = {
          id: Date.now() + 1,
          content: chatResponse.message,
          sender: 'bot',
          timestamp: new Date(),
          agent: chatResponse.agent, // Include agent information
          synced: false
        };
        
        // Save to remote storage
        try {
          await saveChatMessage(originatingSessionId, botMessage);
          console.log(`[ChatUI] 🔄 BACKGROUND: Saved bot message to remote storage for session: ${originatingSessionId}`);
          console.log(`[ChatUI] 🔄 BACKGROUND: Bot response content:`, chatResponse.message);
        } catch (error) {
          console.error(`[ChatUI] Failed to save background bot message:`, error);
        }
        
        console.log(`[ChatUI] 🔵 CALLING markChatNewMessage for background session: ${originatingSessionId}`);
        markChatNewMessage(originatingSessionId, true, activeChatIdRef.current); // Pass current active ID
        console.log(`[ChatUI] Background response received for session: ${originatingSessionId}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[ChatUI] Request cancelled for session: ${originatingSessionId}`);
        return;
      }
      
      // Handle errors for both active and background chats
      if (originatingSessionId === activeChatIdRef.current) {
        const errorMessage: HybridMessage = {
          id: Date.now() + 1,
          content: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          synced: false
        };
        
        // Save to hybrid storage and update UI
        saveChatMessage(originatingSessionId, errorMessage);
        setMessages((msgs) => [...msgs, errorMessage]);
      } else {
        // Handle error for background chat
        const errorMessage: HybridMessage = {
          id: Date.now() + 1,
          content: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          synced: false
        };
        
        // Save to hybrid storage
        saveChatMessage(originatingSessionId, errorMessage);
      }
      console.warn(`[ChatUI] Error in session ${originatingSessionId}:`, error);
    } finally {
      // Clear loading state for this specific chat
      setChatLoading(originatingSessionId, false);
      
      // Cleanup request tracking
      setPendingRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ChatSettingsProvider sessionId={effectiveActiveChatId || 'default'}>
      <div className="h-full flex flex-col backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-4 border-b border-white/20 dark:border-white/10 backdrop-blur-md bg-white/20 dark:bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <BotAvatar agentType={currentChat?.agentType} />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold theme-text-primary">
                  {currentChat?.title || 'AI Assistant'}
                </h3>
                <div className="flex items-center space-x-2">
                  <p className="text-sm theme-text-secondary">Online • Ready to help</p>
                  {currentChat?.agentType && (
                    <AgentIndicator agentType={currentChat.agentType} className="text-xs" />
                  )}
                  <CrossSessionMemoryIndicator 
                    isEnabled={settings.crossSessionMemory} 
                    className="text-xs" 
                  />
                </div>
              </div>
            </div>
            
            {/* Chat settings toggles */}
            <div className="flex items-center space-x-3">
              <ChatSettingsToggles />
            </div>
          </div>
        </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {/* Remote loading indicator */}
        {isLoadingRemoteMessages && <RemoteLoadingIndicator />}
        
        {/* Show skeleton messages while loading */}
        {isLoadingRemoteMessages && messages.length === 0 && (
          <MessageSkeleton count={3} />
        )}
        
        {/* Show actual messages */}
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={clsx(
              'flex items-end space-x-2 animate-in slide-in-from-bottom-2 duration-300',
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {msg.sender === 'user' ? <UserAvatar /> : <BotAvatar agentType={msg.agent || currentChat?.agentType} />}
            <div className={clsx(
              'max-w-xs lg:max-w-md xl:max-w-lg',
              msg.sender === 'user' ? 'order-1' : 'order-2'
            )}>
              <div
                className={clsx(
                  'px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md border transition-all duration-200 hover:shadow-xl',
                  msg.sender === 'user'
                    ? 'theme-accent text-white rounded-br-md border-blue-400/30'
                    : 'bg-white/60 dark:bg-black/40 theme-text-primary rounded-bl-md border-white/20'
                )}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              <div className={clsx(
                'mt-1 text-xs theme-text-secondary',
                msg.sender === 'user' ? 'text-right' : 'text-left'
              )}>
                {formatTime(msg.timestamp)}
                {/* Show sync status for debugging */}
                {!msg.synced && (
                  <span className="ml-2 text-orange-500">•</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && <TypingIndicator agentType={currentChat?.agentType} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/20 dark:bg-black/20">
        <div className="flex items-center space-x-3">
          <SlashCommandInput
            value={input}
            onChange={setInput}
            onSubmit={sendMessage}
            onSlashCommand={(command, cleanMessage) => {
              console.log('[ChatUI] Slash command selected:', command.name, 'Clean message:', cleanMessage);
              // The slash command will be processed by the backend when sendMessage is called
            }}
            disabled={loading}
            placeholder="Type your message or use /command..."
          />
          <button
            className={clsx(
              'px-6 py-3 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95',
              loading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'theme-accent text-white'
            )}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {['Hello!', 'How are you?', 'Tell me a joke', 'What can you do?'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1 text-xs rounded-full backdrop-blur-md bg-white/40 dark:bg-black/30 border border-white/30 theme-text-secondary hover:bg-white/60 dark:hover:bg-black/50 transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
    </ChatSettingsProvider>
  );
}; 