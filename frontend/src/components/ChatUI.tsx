import React, { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { sendChatMessage, ChatResponse, markChatAsRead, sendChatMessageStream } from '../api/chat';
import { useChatManager, HybridMessage } from '../hooks/useChatManager';
import { ChatSettingsProvider } from '../hooks/useChatSettings';
import { ChatSettingsToggles } from './ChatSettingsToggles';
import { AgentAvatarService, AgentAvatarConfig } from '../services/AgentAvatarService';
import { useChatSettings } from '../hooks/useChatSettings';
import { SlashCommandInput } from './SlashCommandInput';
import { SlashCommand } from '../hooks/useSlashCommands';
import { MessageSkeleton } from './SkeletonLoader';
import { MessageItem } from './MessageItem';
import { StatusMessage, StatusMessageProps } from './StatusMessage';
import { ToolStatusMessage } from './ToolStatusMessage';

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
  const { activeChatId, chats, setChatLoading, markChatNewMessage, getChatMessages, loadMoreChatMessages, getCachedMessages, saveChatMessage, trackAgentUsage } = useChatManager();
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
  const [displayedMessages, setDisplayedMessages] = useState<HybridMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingRemoteMessages, setIsLoadingRemoteMessages] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // NEW: Flag to prevent conflicting scroll management
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>(''); // For accumulating streamed content
  const [isStreaming, setIsStreaming] = useState(false); // Track if we're currently streaming
  const streamingBatchRef = useRef<NodeJS.Timeout>(); // Batch timer for streaming updates
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null); // Track WHICH session is streaming
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null); // Track which message is streaming
  const [streamingAgent, setStreamingAgent] = useState<string | undefined>(); // Track which agent is streaming
  const [statusMessages, setStatusMessages] = useState<StatusMessageProps[]>([]); // Track status messages during streaming
  
  // 2025 Best Practices: User scroll state management
  const [userHasScrolled, setUserHasScrolled] = useState(false); // Track if user manually scrolled
  const [isAtBottom, setIsAtBottom] = useState(true); // Track if user is at/near bottom
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true); // Control auto-scroll behavior
  const lastScrollTopRef = useRef(0); // Track scroll direction
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(); // Debounce scroll events
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [pendingRequests, setPendingRequests] = useState<Map<string, AbortController>>(new Map());
  const streamControllerRef = useRef<{ abort: () => void } | null>(null);
  const accumulatedContentRef = useRef<string>(''); // Use ref to track accumulated content during streaming
  const streamingScrollThrottleRef = useRef<NodeJS.Timeout>(); // Throttle streaming scroll calls
  
  // Simple working scroll to user message with improved timing
  const positionForBotResponse = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    // Reset scroll state for new message
    setUserHasScrolled(false);
    setAutoScrollEnabled(true);
    
    // Wait for DOM to update, then scroll to user message
    setTimeout(() => {
      if (!messagesContainerRef.current) return;
      
      const container = messagesContainerRef.current;
      
      // Find all user messages (they have theme-accent class)
      const userMessages = container.querySelectorAll('[data-message-id] .theme-accent');
      
      if (userMessages.length > 0) {
        // Get the last user message and scroll it to top
        const lastUserMessage = userMessages[userMessages.length - 1];
        const messageElement = lastUserMessage.closest('[data-message-id]') as HTMLElement;
        
        if (messageElement) {
          messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // Fallback: ensure scroll happened after animation
          setTimeout(() => {
            if (messagesContainerRef.current && messageElement) {
              const rect = messageElement.getBoundingClientRect();
              const containerRect = messagesContainerRef.current.getBoundingClientRect();
              
              // If message is not at the top, scroll again
              if (rect.top - containerRect.top > 20) {
                messageElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            }
          }, 500);
        }
      }
    }, 300); // Increased delay for better DOM update reliability
  }, []);
  
  // Industry standard: Always scroll during streaming, smart detection for other times
  useEffect(() => {
    if (streamingMessage && isStreaming) {
      // During active streaming, always scroll to bottom - ignore user scroll detection
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingMessage, isStreaming]);
  
  // 2025 Best Practices: Smart scroll detection with throttling
  const handleUserScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollDirection = scrollTop > lastScrollTopRef.current ? 'down' : 'up';
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const currentIsAtBottom = distanceFromBottom < 50; // 50px threshold
    
    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Update scroll direction reference
    lastScrollTopRef.current = scrollTop;
    
    // Update bottom state immediately
    setIsAtBottom(currentIsAtBottom);
    
    // Detect if this is user-initiated scrolling (not during auto-scroll operations)
    if (!isStreaming || scrollDirection === 'up') {
      setUserHasScrolled(true);
      setAutoScrollEnabled(currentIsAtBottom); // Re-enable auto-scroll only when at bottom
    }
    
    // Debounce the user scroll detection to avoid excessive state updates  
    scrollTimeoutRef.current = setTimeout(() => {
      // Skip logging for performance
    }, 100);
  }, [isStreaming]);
  
  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Throttled scroll handler for performance
    let ticking = false;
    const throttledScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleUserScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    container.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', throttledScrollHandler);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleUserScroll]);
  
  // 2025 Best Practices: Reset scroll states when switching chats
  useEffect(() => {
    setUserHasScrolled(false);
    setIsAtBottom(true);
    setAutoScrollEnabled(true);
    lastScrollTopRef.current = 0;
    
    // Clear any pending scroll timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    if (streamingScrollThrottleRef.current) {
      clearTimeout(streamingScrollThrottleRef.current);
    }
  }, [effectiveActiveChatId]);
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (streamingScrollThrottleRef.current) {
        clearTimeout(streamingScrollThrottleRef.current);
      }
    };
  }, []);
  
  // Per-session streaming state management
  interface StreamingState {
    isStreaming: boolean;
    messageId: number;
    content: string;
    agent?: string;
    statusMessages: StatusMessageProps[];
  }
  const streamingStatesRef = useRef<Map<string, StreamingState>>(new Map());
  const streamControllersRef = useRef<Map<string, StreamController>>(new Map());
  
  // DEBUG: State for debug panel
  const [debugStreamData, setDebugStreamData] = useState<{ tokens: string[]; events: string[]; raw: string }>({ 
    tokens: [], 
    events: [], 
    raw: '' 
  });

  // Remove global loading state, use per-chat loading from context
  const loading = currentChat?.isLoading || false;
  const [wasLoading, setWasLoading] = useState(false);

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
    // Don't run this during load more operations
    if (isLoadingMore) {
      console.log(`[ChatUI] Skipping chat switch logic - load more in progress`);
      return;
    }
    
    console.log(`[ChatUI] useEffect: Loading messages for session change: ${effectiveActiveChatId}`);
    if (effectiveActiveChatId) {
      // Mark as initial load to prevent animations
      setIsInitialLoad(true);
      setIsScrollReady(false); // Hide content until scroll is set
      
      // Reset scroll position immediately when switching chats
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
      
      loadMessagesProgressively(effectiveActiveChatId).then(loadedMessages => {
        setMessages(loadedMessages);
        setDisplayedMessages(loadedMessages.slice(-INITIAL_MESSAGE_COUNT)); // Reset displayed messages to last 50
        setHasLoadedMore(false); // Reset when switching chats
        console.log(`[ChatUI] useEffect: Loaded ${loadedMessages.length} messages for session: ${effectiveActiveChatId}`);
        
        // Double requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              console.log(`[ChatUI] Scroll set to bottom for session: ${effectiveActiveChatId}`);
            }
            setIsScrollReady(true); // Show content after scroll is set
            // After messages are loaded, mark initial load as complete
            setTimeout(() => setIsInitialLoad(false), 50);
          });
        });
      });
    }
  }, [effectiveActiveChatId, isLoadingMore]); // Added isLoadingMore to dependencies

  // Monitor chat loading state and update local loading indicator
  useEffect(() => {
    if (currentChat) {
      setIsLoadingRemoteMessages(currentChat.isLoadingMessages);
      // Only log when loading state actually changes
      if (currentChat.isLoadingMessages) {
        console.log(`[ChatUI] Loading messages for session ${effectiveActiveChatId}`);
      }
    }
  }, [currentChat?.isLoadingMessages, effectiveActiveChatId]);

  // Listen for message updates from progressive loading - optimized
  useEffect(() => {
    if (effectiveActiveChatId && !isLoadingRemoteMessages && !loading && !isStreaming) {
      // Check for updated messages periodically when not loading or streaming
      const interval = setInterval(() => {
        const currentMessages = getCachedMessages(effectiveActiveChatId);
        if (currentMessages.length !== messages.length) {
          console.log(`[ChatUI] Detected message updates from background sync for session: ${effectiveActiveChatId}`);
          setMessages(currentMessages.length > 0 ? currentMessages : initialMessages);
        }
      }, 5000); // Check every 5 seconds (reduced frequency)

      return () => clearInterval(interval);
    }
  }, [effectiveActiveChatId, isLoadingRemoteMessages, messages.length, getCachedMessages, loading, isStreaming]);

  // Auto-scroll when loading state changes (typing indicator appears/disappears)
  useEffect(() => {
    if (loading && !wasLoading) {
      // Typing indicator just appeared - scroll to show it
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
    }
    setWasLoading(loading);
  }, [loading, wasLoading]);
  
  // Auto-scroll to bottom for new messages only
  useEffect(() => {
    if (!isInitialLoad && isScrollReady && messages.length > 0) {
      // Small delay to ensure DOM has updated with new message
      const scrollTimeout = setTimeout(() => {
        if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
          
          // Always scroll for new messages if user is at or near bottom
          if (isAtBottom || messages[messages.length - 1]?.sender === 'user') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
      }, 100);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [messages, isInitialLoad, isScrollReady]);

  // Update the ref whenever effectiveActiveChatId changes
  // 🚨 CRITICAL: DO NOT REMOVE - Required for race condition fix
  // Without this useEffect, the ref becomes stale and race condition returns
  // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
  useEffect(() => {
    activeChatIdRef.current = effectiveActiveChatId;
    
    // Save streaming state when switching away from a streaming session
    if (streamingSessionId && streamingSessionId !== effectiveActiveChatId) {
      // Save the current streaming state
      if (streamingMessageId && isStreaming) {
        streamingStatesRef.current.set(streamingSessionId, {
          isStreaming: true,
          messageId: streamingMessageId,
          content: accumulatedContentRef.current || streamingMessage,
          agent: streamingAgent,
          statusMessages: statusMessages
        });
        
        // Update the message with partial content
        setMessages(msgs => msgs.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: accumulatedContentRef.current || streamingMessage, isStreaming: true }
            : msg
        ));
      }
      
      // Clear UI streaming state (but keep background streaming active)
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingMessageId(null);
      setStreamingAgent(undefined);
      setStatusMessages([]);
    }
    
    // Restore streaming state when switching to a session that was streaming
    if (effectiveActiveChatId && streamingStatesRef.current.has(effectiveActiveChatId)) {
      const savedState = streamingStatesRef.current.get(effectiveActiveChatId);
      if (savedState?.isStreaming) {
        setIsStreaming(true);
        setStreamingSessionId(effectiveActiveChatId);
        setStreamingMessageId(savedState.messageId);
        setStreamingMessage(savedState.content);
        setStreamingAgent(savedState.agent);
        setStatusMessages(savedState.statusMessages);
        accumulatedContentRef.current = savedState.content;
      }
    }
  }, [effectiveActiveChatId]);

  // Removed: Streaming scroll useEffect - now handled directly in batch update

  // REMOVED: Request cancellation useEffect for background processing

  // Cleanup streaming on unmount only (not on chat change)
  useEffect(() => {
    return () => {
      // Only abort all streams on component unmount
      streamControllersRef.current.forEach((controller, sessionId) => {
        console.log(`[ChatUI] Aborting stream for session ${sessionId} on unmount`);
        controller.abort();
      });
      streamControllersRef.current.clear();
      streamingStatesRef.current.clear();
    };
  }, []); // Empty dependency array - only run on unmount

  const sendMessageWithStreaming = async () => {
    if (!input.trim() || loading || !effectiveActiveChatId || isStreaming) return;
    
    const originatingSessionId = String(effectiveActiveChatId);
    console.log(`[ChatUI] 🚀 SENDING MESSAGE WITH STREAMING - originatingSessionId: ${originatingSessionId}`);
    
    // Set loading state for this specific chat
    setChatLoading(originatingSessionId, true);
    setIsStreaming(true);
    setStreamingSessionId(originatingSessionId); // Track which session is streaming
    setStreamingMessage('');
    setStreamingAgent(undefined);
    accumulatedContentRef.current = ''; // Reset accumulated content ref
    
    // DEBUG: Reset debug data for new stream
    setDebugStreamData({ tokens: [], events: [], raw: '' });
    
    // Use local variables to track streaming session data
    let currentStreamingAgent: string | undefined = undefined;
    
    const userMessage: HybridMessage = {
      id: Date.now(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      synced: false
    };
    
    // Save user message immediately
    saveChatMessage(originatingSessionId, userMessage);
    console.log(`[ChatUI] User message saved for streaming session: ${originatingSessionId}`);
    
    // Update current UI with the user message
    setMessages(prev => [...prev, userMessage]);
    setDisplayedMessages(prev => [...prev, userMessage]); // Also update displayed messages
    const currentInput = input;
    setInput('');
    
    // Create placeholder for bot message with typing indicator
    const botMessageId = Date.now() + 1;
    const botMessagePlaceholder: HybridMessage = {
      id: botMessageId,
      content: '', // Empty content will show typing indicator
      sender: 'bot',
      timestamp: new Date(),
      synced: false,
      agent: undefined,
      isStreaming: true // Add flag to indicate this is a streaming message
    };
    
    // Add placeholder immediately to show typing indicator
    setMessages(prev => {
      console.log('[ChatUI] Adding bot placeholder to messages, prev length:', prev.length);
      return [...prev, botMessagePlaceholder];
    });
    setDisplayedMessages(prev => {
      console.log('[ChatUI] Adding bot placeholder to displayedMessages, prev length:', prev.length);
      const updated = [...prev, botMessagePlaceholder];
      console.log('[ChatUI] displayedMessages after adding placeholder:', updated.length, 'last msg:', updated[updated.length - 1]);
      return updated;
    });
    setStreamingMessageId(botMessageId); // Track which message is streaming
    console.log('[ChatUI] Set streamingMessageId to:', botMessageId);
    
    // 2025 Best Practices: Smart positioning with proper timing
    positionForBotResponse();
    
    try {
      // Check for pending slash command metadata
      const pendingSlashCommand = (window as any).__pendingSlashCommand;
      const options: any = {
        activeSessionId: activeChatIdRef.current,
        callbacks: {
          onStart: (data: { agent?: string; sessionId: string }) => {
            console.log('[ChatUI] Stream started:', data);
            console.log('[ChatUI] Current displayedMessages:', displayedMessages.length, 'messages');
            console.log('[ChatUI] Bot message in displayedMessages?', displayedMessages.find(m => m.id === botMessageId));
            
            currentStreamingAgent = data.agent;
            setStreamingAgent(data.agent);
            if (data.agent) {
              trackAgentUsage(originatingSessionId, data.agent);
            }
            
            // DEBUG: Add to debug panel
            setDebugStreamData(prev => ({
              ...prev,
              events: [...prev.events, `START: agent=${data.agent}`],
              raw: prev.raw + `\n[START] ${JSON.stringify(data)}`
            }));
            
            // DEBUG: Check displayedMessages after state updates
            setTimeout(() => {
              console.log('[ChatUI] After onStart - checking displayedMessages...');
              setDisplayedMessages(currentMsgs => {
                console.log('[ChatUI] displayedMessages in setState:', currentMsgs.length, 'bot msg exists?', !!currentMsgs.find(m => m.id === botMessageId));
                return currentMsgs;
              });
            }, 0);
          },
          onToken: (token: string) => {
            // DEBUG: Add to debug panel only
            setDebugStreamData(prev => ({
              ...prev,
              tokens: [...prev.tokens, token],
              raw: prev.raw + token
            }));
            
            // Accumulate content in ref (immediate)
            accumulatedContentRef.current += token;
            const currentContent = accumulatedContentRef.current;
            
            // Update streaming state map for this session (immediate)
            streamingStatesRef.current.set(originatingSessionId, {
              isStreaming: true,
              messageId: botMessageId,
              content: currentContent,
              agent: currentStreamingAgent,
              statusMessages: []
            });
            
            // Update UI immediately for real-time streaming effect
            if (String(originatingSessionId) === String(activeChatIdRef.current)) {
              setStreamingMessage(currentContent);
            }
            
            // Update message content in the array immediately
            setMessages(msgs => msgs.map(msg => 
              msg.id === botMessageId ? { ...msg, content: currentContent } : msg
            ));
          },
          onStatus: (data: { type: string; message: string; metadata?: any }) => {
            console.log('[ChatUI] Status received:', data);
            setStatusMessages(prev => [...prev, {
              ...data,
              timestamp: new Date()
            }]);
          },
          onToolStart: (data: { toolId: string; toolName: string; parameters?: any; agentName?: string }) => {
            console.log('[ChatUI] Tool started:', data);
            
            // Add tool start message to the stream
            const toolMessage: HybridMessage = {
              id: Date.now() + Math.random(),
              content: '', // Tool messages don't need content
              sender: 'tool',
              timestamp: new Date(),
              synced: false,
              toolExecution: {
                id: data.toolId,
                toolName: data.toolName,
                status: 'starting',
                parameters: data.parameters,
                startTime: new Date(),
                agentName: data.agentName || currentStreamingAgent,
                isExpanded: false
              }
            };
            
            setMessages(prev => [...prev, toolMessage]);
            setDisplayedMessages(prev => [...prev, toolMessage]);
          },
          onToolProgress: (data: { toolId: string; progress: string; metadata?: any }) => {
            console.log('[ChatUI] Tool progress:', data);
            
            // Update existing tool message status
            setMessages(prev => prev.map(msg => {
              if (msg.toolExecution?.id === data.toolId) {
                return {
                  ...msg,
                  toolExecution: {
                    ...msg.toolExecution,
                    status: 'running'
                  }
                };
              }
              return msg;
            }));
            
            setDisplayedMessages(prev => prev.map(msg => {
              if (msg.toolExecution?.id === data.toolId) {
                return {
                  ...msg,
                  toolExecution: {
                    ...msg.toolExecution,
                    status: 'running'
                  }
                };
              }
              return msg;
            }));
          },
          onToolResult: (data: { toolId: string; result: any }) => {
            console.log('[ChatUI] Tool completed:', data);
            
            // Update tool message with result
            const endTime = new Date();
            setMessages(prev => prev.map(msg => {
              if (msg.toolExecution?.id === data.toolId) {
                const startTime = msg.toolExecution.startTime;
                return {
                  ...msg,
                  toolExecution: {
                    ...msg.toolExecution,
                    status: 'completed',
                    result: data.result,
                    endTime,
                    duration: endTime.getTime() - new Date(startTime).getTime()
                  }
                };
              }
              return msg;
            }));
            
            setDisplayedMessages(prev => prev.map(msg => {
              if (msg.toolExecution?.id === data.toolId) {
                const startTime = msg.toolExecution.startTime;
                return {
                  ...msg,
                  toolExecution: {
                    ...msg.toolExecution,
                    status: 'completed',
                    result: data.result,
                    endTime,
                    duration: endTime.getTime() - new Date(startTime).getTime()
                  }
                };
              }
              return msg;
            }));
          },
          onToolError: (data: { toolId: string; error: string }) => {
            console.log('[ChatUI] Tool error:', data);
            
            // Update tool message with error
            const endTime = new Date();
            setMessages(prev => prev.map(msg => {
              if (msg.toolExecution?.id === data.toolId) {
                const startTime = msg.toolExecution.startTime;
                return {
                  ...msg,
                  toolExecution: {
                    ...msg.toolExecution,
                    status: 'error',
                    error: data.error,
                    endTime,
                    duration: endTime.getTime() - new Date(startTime).getTime()
                  }
                };
              }
              return msg;
            }));
            
            setDisplayedMessages(prev => prev.map(msg => {
              if (msg.toolExecution?.id === data.toolId) {
                const startTime = msg.toolExecution.startTime;
                return {
                  ...msg,
                  toolExecution: {
                    ...msg.toolExecution,
                    status: 'error',
                    error: data.error,
                    endTime,
                    duration: endTime.getTime() - new Date(startTime).getTime()
                  }
                };
              }
              return msg;
            }));
          },
          onDone: async (data: { agent?: string; orchestration?: any; memoryStatus?: any }) => {
            // Clear any pending batch updates to ensure final content is preserved
            if (streamingBatchRef.current) {
              clearTimeout(streamingBatchRef.current);
            }
            
            // DEBUG: Add to debug panel only
            setDebugStreamData(prev => ({
              ...prev,
              events: [...prev.events, `DONE: ${JSON.stringify(data)}`],
              raw: prev.raw + `\n[DONE] Total: ${accumulatedContentRef.current.length} chars`
            }));
            
            const finalContent = accumulatedContentRef.current;
            
            // Create final message object without streaming flag
            const finalMessage: HybridMessage = {
              id: botMessageId,
              content: finalContent || 'I apologize, but I was unable to generate a response.',
              sender: 'bot',
              timestamp: new Date(),
              agent: data.agent || currentStreamingAgent,
              synced: false,
              isStreaming: false, // Remove streaming flag
              memoryStatus: data.memoryStatus
            };
            
            // Force immediate final content update to prevent disappearing text
            setMessages(msgs => msgs.map(msg => 
              msg.id === botMessageId ? { 
                ...msg, 
                content: finalContent, 
                agent: finalMessage.agent, 
                isStreaming: false,
                memoryStatus: finalMessage.memoryStatus
              } : msg
            ));
            
            // Also update streaming message state to final content
            if (String(originatingSessionId) === String(activeChatIdRef.current)) {
              setStreamingMessage(finalContent);
            }
            
            // Save to hybrid storage
            try {
              await saveChatMessage(originatingSessionId, finalMessage);
              markChatNewMessage(originatingSessionId, true, activeChatIdRef.current);
              
              // Mark as read immediately (non-blocking)
              if (String(originatingSessionId) === String(activeChatIdRef.current)) {
                markChatAsRead(originatingSessionId)
                  .catch(err => console.error('[ChatUI] Failed to mark as read:', err));
              }
            } catch (error) {
              console.error('[ChatUI] Error saving message:', error);
            }
            
            // Clean up streaming state map for this session
            streamingStatesRef.current.delete(originatingSessionId);
            
            // Clear any pending batch updates
            if (streamingBatchRef.current) {
              clearTimeout(streamingBatchRef.current);
            }
            
            // Only clear UI state if this is the active session
            if (String(originatingSessionId) === String(activeChatIdRef.current)) {
              setIsStreaming(false);
              setStreamingSessionId(null);
              setStreamingMessageId(null);
              setStatusMessages([]);
              
              // Clear streaming message state after a delay to ensure final content is displayed
              setTimeout(() => {
                setStreamingMessage('');
              }, 500);
            }
            
            setChatLoading(originatingSessionId, false);
            // Don't clear accumulated content yet - wait until streaming message is cleared
            setTimeout(() => {
              accumulatedContentRef.current = '';
            }, 600);
          },
          onError: (error: Error) => {
            console.error('[ChatUI] Stream error:', error);
            
            // DEBUG: Add to debug panel
            setDebugStreamData(prev => ({
              ...prev,
              events: [...prev.events, `ERROR: ${error.message}`],
              raw: prev.raw + `\n[ERROR] ${error.message}`
            }));
            
            // Update message with error
            setMessages(msgs => msgs.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
                : msg
            ));
            setDisplayedMessages(msgs => msgs.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
                : msg
            ));
            
            // Clean up streaming state map on error
            streamingStatesRef.current.delete(originatingSessionId);
            
            // Only clear UI state if this is the active session
            if (String(originatingSessionId) === String(activeChatIdRef.current)) {
              setIsStreaming(false);
              setStreamingSessionId(null); // Clear streaming session
              setStreamingMessageId(null); // Clear streaming message
              setStatusMessages([]); // Clear status messages on error
            }
            
            setChatLoading(originatingSessionId, false);
          }
        }
      };
      
      // Add slash command metadata if present
      if (pendingSlashCommand) {
        options.slashCommand = pendingSlashCommand;
        delete (window as any).__pendingSlashCommand;
      }
      
      // Start streaming (include activeSessionId for background message tracking)
      options.activeSessionId = activeChatIdRef.current;
      // Starting stream with session validation
      
      // Abort any existing stream for this session
      const existingController = streamControllersRef.current.get(originatingSessionId);
      if (existingController) {
        console.log(`[ChatUI] Aborting existing stream for session ${originatingSessionId}`);
        existingController.abort();
      }
      
      // Start new stream and store controller
      const newController = sendChatMessageStream(currentInput, originatingSessionId, options);
      streamControllersRef.current.set(originatingSessionId, newController);
      streamControllerRef.current = newController; // Keep for backward compatibility
      
    } catch (error: any) {
      console.error(`[ChatUI] Streaming error in session ${originatingSessionId}:`, error);
      
      const errorMessage: HybridMessage = {
        id: Date.now() + 1,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        synced: false
      };
      
      setMessages(msgs => [...msgs, errorMessage]);
      setDisplayedMessages(msgs => [...msgs, errorMessage]);
      saveChatMessage(originatingSessionId, errorMessage);
      
      setIsStreaming(false);
      setStreamingSessionId(null);
      setStreamingMessageId(null);
      setChatLoading(originatingSessionId, false);
    }
  };

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
      // Check for pending slash command metadata
      const pendingSlashCommand = (window as any).__pendingSlashCommand;
      const options: any = {
        signal: abortController.signal,
        activeSessionId: activeChatIdRef.current
      };
      
      // Add slash command metadata if present
      if (pendingSlashCommand) {
        options.slashCommand = pendingSlashCommand;
        // Clear the pending slash command
        delete (window as any).__pendingSlashCommand;
      }
      
      const chatResponse = await sendChatMessage(currentInput, originatingSessionId, options);
      
      // CRITICAL FIX: Use the ref to get the ACTUAL current session at response time
      // 🚨 CRITICAL: DO NOT CHANGE - Must use activeChatIdRef.current, not effectiveActiveChatId
      // Using effectiveActiveChatId here will cause race condition to return
      // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
      console.log(`[ChatUI] 📥 RESPONSE RECEIVED - originatingSessionId: ${originatingSessionId}, activeChatId at response time: ${activeChatIdRef.current}`);
      console.log(`[ChatUI] 🔍 Session validation: ${originatingSessionId} === ${activeChatIdRef.current} ? ${String(originatingSessionId) === String(activeChatIdRef.current)}`);
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
      if (String(originatingSessionId) === String(activeChatIdRef.current)) {
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
      if (String(originatingSessionId) === String(activeChatIdRef.current)) {
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

  // formatTime is used in MessageItem component

  // Progressive message display for better performance
  const INITIAL_MESSAGE_COUNT = 50;
  
  // Update displayed messages when messages change
  useEffect(() => {
    // CRITICAL: Don't sync during streaming - it will wipe out the placeholder!
    if (isStreaming) {
      // Skip sync during streaming (logged only once per streaming session)
      return;
    }
    
      // Skip excessive logging
    // Always show all messages after load more
    if (hasLoadedMore) {
      setDisplayedMessages(messages);
      return;
    }
    
    // Don't interfere with displayed messages during load more operations
    if (isLoadingMore) {
      console.log('[ChatUI] Skipping progressive display update - load more in progress');
      return;
    }
    
    // Use total message count from chat metadata to decide whether to show all or recent messages
    const totalMessageCount = currentChat?.messageCount || messages.length;
    
    if (totalMessageCount <= INITIAL_MESSAGE_COUNT) {
      setDisplayedMessages(messages);
    } else {
      // Show only recent messages initially (the backend already returns the most recent 50)
      setDisplayedMessages(messages.slice(-INITIAL_MESSAGE_COUNT));
    }
  }, [messages, hasLoadedMore, currentChat?.messageCount, isLoadingMore, isStreaming]);
  
  // Force scroll to bottom when messages are updated during initial load
  useEffect(() => {
    if (isLoadingMore || isScrollReady) return;
    
    if (displayedMessages.length > 0 && messagesContainerRef.current) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [displayedMessages, isScrollReady, isLoadingMore]);
  
  // Load more messages handler with isolated scroll preservation
  const loadMoreMessages = useCallback(async () => {
    if (!effectiveActiveChatId || !currentChat || isLoadingMore) return;
    
    console.log(`[ChatUI] Starting load more - current messages: ${messages.length}, displayed: ${displayedMessages.length}, total: ${currentChat.messageCount}`);
    
    // Set loading flags to prevent interference from other useEffects
    setIsLoadingMore(true);
    setIsLoadingRemoteMessages(true);
    
    try {
      // Save scroll position before any DOM changes
      const scrollContainer = messagesContainerRef.current;
      if (!scrollContainer) {
        console.error('[ChatUI] No scroll container ref available');
        return;
      }
      
      const beforeState = {
        scrollTop: scrollContainer.scrollTop,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight
      };
      
      console.log(`[ChatUI] Before load more:`, beforeState);
      
      // Call backend to get additional messages
      const allMessages = await loadMoreChatMessages(effectiveActiveChatId, displayedMessages.length);
      
      console.log(`[ChatUI] Backend returned ${allMessages.length} total messages (was ${messages.length})`);
      
      // Batch all state updates together
      setMessages(allMessages);
      setDisplayedMessages(allMessages);
      setHasLoadedMore(true);
      
      // Force scroll position restore after React renders
      setTimeout(() => {
        if (scrollContainer) {
          const afterHeight = scrollContainer.scrollHeight;
          const heightDiff = afterHeight - beforeState.scrollHeight;
          
          // Maintain scroll position by adding the height difference
          scrollContainer.scrollTop = beforeState.scrollTop + heightDiff;
          
          console.log(`[ChatUI] Scroll restored: was ${beforeState.scrollTop}, height grew by ${heightDiff}, now ${scrollContainer.scrollTop}`);
        }
      }, 0);
      
    } catch (error) {
      console.error('[ChatUI] Failed to load more messages:', error);
    } finally {
      // Clear loading flags after a delay to prevent race conditions
      setTimeout(() => {
        setIsLoadingMore(false);
        setIsLoadingRemoteMessages(false);
      }, 100);
    }
  }, [effectiveActiveChatId, currentChat, displayedMessages.length, loadMoreChatMessages, isLoadingMore]);

  // 2025 Best Practices: Smart auto-scroll that respects user intent
  useEffect(() => {
    if (isLoadingMore || hasLoadedMore || isStreaming || !isScrollReady || isInitialLoad) {
      return; // Skip during operations that manage their own scrolling
    }
    
    if (displayedMessages.length > 0 && autoScrollEnabled && isAtBottom) {
      // Only auto-scroll when user is at bottom and hasn't manually scrolled away
      const lastMessage = displayedMessages[displayedMessages.length - 1];
      
      if (lastMessage?.sender === 'user' || !userHasScrolled) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
      }
    }
  }, [displayedMessages, isScrollReady, isInitialLoad, isLoadingMore, hasLoadedMore, isStreaming, autoScrollEnabled, isAtBottom, userHasScrolled]);

  // Skip excessive render logging
  
  return (
    <ChatSettingsProvider sessionId={effectiveActiveChatId || 'default'}>
      <div className="h-full flex flex-1">
        {/* Main chat container */}
        <div className="h-full flex flex-col flex-1 backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
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
      <div 
        key={effectiveActiveChatId} // Force React to recreate this div when chat changes
        ref={messagesContainerRef} 
        className={clsx(
          "flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent transition-opacity duration-150",
          // Don't hide during load more operations or streaming
          (isScrollReady || isLoadingMore || isStreaming) ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ scrollBehavior: isInitialLoad ? 'auto' : 'smooth' }}
      >
        {/* Remote loading indicator */}
        {isLoadingRemoteMessages && messages.length === 0 && <RemoteLoadingIndicator />}
        
        {/* Loading more messages indicator */}
        {isLoadingRemoteMessages && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="backdrop-blur-md bg-blue-500/20 dark:bg-blue-400/20 rounded-2xl px-4 py-2 shadow-lg border border-blue-400/30">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 animate-spin theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium theme-text-primary">Loading older messages...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Show skeleton messages while loading */}
        {isLoadingRemoteMessages && messages.length === 0 && (
          <MessageSkeleton count={3} />
        )}
        
        {/* Load more button if there are hidden messages */}
        {currentChat && currentChat.messageCount > displayedMessages.length && !isLoadingRemoteMessages && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMoreMessages}
              className="px-4 py-2 text-sm rounded-full backdrop-blur-md bg-white/40 dark:bg-black/30 border border-white/30 theme-text-secondary hover:bg-white/60 dark:hover:bg-black/50 transition-all duration-200"
              disabled={isLoadingRemoteMessages}
            >
              {`Load ${currentChat.messageCount - displayedMessages.length} earlier messages`}
            </button>
          </div>
        )}
        
        {/* Show actual messages */}
        <div className="space-y-0">
          {displayedMessages.map((msg, index) => {
            // Only animate new messages, not on initial load or chat switch
            const showAnimation = !isInitialLoad && index === displayedMessages.length - 1 && index === messages.length - 1;
            
            // Check if this message is currently streaming (either in UI state or in the map)
            const streamingState = streamingStatesRef.current.get(effectiveActiveChatId);
            const isMessageStreaming = msg.isStreaming || 
                                     (streamingState && streamingState.messageId === msg.id);
            
            // For the streaming message, override content with live streaming data
            const isStreamingMessage = (isStreaming && 
                                      streamingSessionId === effectiveActiveChatId && 
                                      streamingMessageId === msg.id) ||
                                     isMessageStreaming;
            
            // Skip excessive render logging
            
            const displayMessage = isStreamingMessage ? {
              ...msg,
              content: streamingMessage || streamingState?.content || msg.content,  // Use live streaming content
              isStreaming: true,
              agent: streamingAgent || streamingState?.agent || msg.agent
            } : msg;
            
            
            // Handle tool messages differently
            if (msg.sender === 'tool' && msg.toolExecution) {
              return (
                <div key={msg.id} data-message-id={msg.id}>
                  <ToolStatusMessage
                    tool={msg.toolExecution}
                    isExpanded={msg.toolExecution.isExpanded || false}
                    onToggleExpanded={() => {
                      // Toggle expansion by updating the message
                      setDisplayedMessages(prev => prev.map(m => 
                        m.id === msg.id 
                          ? { ...m, toolExecution: { ...m.toolExecution!, isExpanded: !m.toolExecution?.isExpanded } }
                          : m
                      ));
                    }}
                  />
                </div>
              );
            }
            
            return (
              <div key={msg.id} data-message-id={msg.id}>
                <MessageItem
                  message={displayMessage}
                  currentChatAgentType={currentChat?.agentType}
                  showAnimation={showAnimation}
                  index={0} // Don't use staggered animations
                />
              </div>
            );
          })}
        </div>
        
        {/* Show status messages during streaming */}
        {isStreaming && statusMessages.length > 0 && (
          <div className="space-y-1 my-2">
            {statusMessages.map((status, index) => (
              <StatusMessage 
                key={`${status.type}-${index}`}
                {...status}
              />
            ))}
          </div>
        )}
        
        {(loading && (!isStreaming || streamingSessionId !== effectiveActiveChatId)) && (
          <div className="mb-4">
            <TypingIndicator agentType={currentChat?.agentType} />
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>


      {/* Input area */}
      <div className="p-4 border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/20 dark:bg-black/20">
        <div className="flex items-center space-x-3">
          <SlashCommandInput
            value={input}
            onChange={setInput}
            onSubmit={sendMessageWithStreaming}
            onSlashCommand={(command, cleanMessage) => {
              console.log('[ChatUI] Slash command selected:', command.name, 'Clean message:', cleanMessage);
              // Update input to clean message and store slash command metadata
              setInput(cleanMessage);
              // Store slash command metadata for the next sendMessage call
              (window as any).__pendingSlashCommand = {
                command: command.name,
                agentType: command.agentType
              };
            }}
            disabled={loading || isStreaming}
            placeholder="Type your message or use /command..."
          />
          <button
            className={clsx(
              'px-6 py-3 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95',
              loading || isStreaming
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'theme-accent text-white'
            )}
            onClick={sendMessageWithStreaming}
            disabled={loading || isStreaming || !input.trim()}
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
    
    {/* DEBUG PANEL - FLOATING GLASS OVERLAY */}
    {isStreaming && streamingSessionId === effectiveActiveChatId && (
      <div className="fixed top-4 right-4 w-80 max-h-96 z-50 flex flex-col backdrop-blur-3xl bg-red-500/5 dark:bg-red-900/5 rounded-2xl border border-red-500/20 shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-red-500/15 bg-red-500/10">
          <h3 className="font-bold text-red-600 dark:text-red-400 text-sm">🔴 DEBUG: Stream Monitor</h3>
          <p className="text-xs text-red-500 dark:text-red-500 mt-1 opacity-75">TEMPORARY - Remove before production</p>
        </div>
        
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Raw accumulated content */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">Raw Stream Output:</h4>
            <div className="p-2 bg-black/10 rounded-lg font-mono text-xs text-green-500 dark:text-green-400 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
              {debugStreamData.raw || '[No data yet...]'}
            </div>
            <p className="text-xs text-red-500 dark:text-red-400 opacity-75">
              Total chars: {debugStreamData.raw.length}
            </p>
          </div>
          
          {/* Token list */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">Tokens ({debugStreamData.tokens.length}):</h4>
            <div className="max-h-24 overflow-y-auto p-2 bg-black/10 rounded-lg space-y-1">
              {debugStreamData.tokens.map((token, i) => (
                <div key={i} className="font-mono text-xs text-blue-500 dark:text-blue-400">
                  [{i}] "{token}" ({token.length} chars)
                </div>
              ))}
              {debugStreamData.tokens.length === 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">[No tokens received yet]</p>
              )}
            </div>
          </div>
          
          {/* Events */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">Events:</h4>
            <div className="max-h-20 overflow-y-auto p-2 bg-black/10 rounded-lg space-y-1">
              {debugStreamData.events.map((event, i) => (
                <div key={i} className="font-mono text-xs text-yellow-600 dark:text-yellow-400">
                  {event}
                </div>
              ))}
              {debugStreamData.events.length === 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">[No events yet]</p>
              )}
            </div>
          </div>
          
          {/* State info */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">Stream State:</h4>
            <div className="p-2 bg-black/10 rounded-lg text-xs space-y-1">
              <p className="text-orange-600 dark:text-orange-400">isStreaming: {isStreaming ? 'true' : 'false'}</p>
              <p className="text-orange-600 dark:text-orange-400">streamingAgent: {streamingAgent || 'none'}</p>
              <p className="text-orange-600 dark:text-orange-400">accumulatedContentRef: {accumulatedContentRef.current.length} chars</p>
              <p className="text-orange-600 dark:text-orange-400">streamingMessage length: {streamingMessage.length}</p>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
    </ChatSettingsProvider>
  );
}; 