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
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null); // Track WHICH session is streaming
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null); // Track which message is streaming
  const [streamingAgent, setStreamingAgent] = useState<string | undefined>(); // Track which agent is streaming
  const [statusMessages, setStatusMessages] = useState<StatusMessageProps[]>([]); // Track status messages during streaming
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [pendingRequests, setPendingRequests] = useState<Map<string, AbortController>>(new Map());
  const streamControllerRef = useRef<{ abort: () => void } | null>(null);
  const accumulatedContentRef = useRef<string>(''); // Use ref to track accumulated content during streaming
  
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
      console.log(`[ChatUI] Updated loading state for session ${effectiveActiveChatId}: ${currentChat.isLoadingMessages}`);
    }
  }, [currentChat?.isLoadingMessages, effectiveActiveChatId]);

  // Listen for message updates from progressive loading - optimized
  useEffect(() => {
    if (effectiveActiveChatId && !isLoadingRemoteMessages) {
      // Check for updated messages periodically when not loading
      const interval = setInterval(() => {
        const currentMessages = getCachedMessages(effectiveActiveChatId);
        if (currentMessages.length !== messages.length) {
          console.log(`[ChatUI] Detected message updates from background sync for session: ${effectiveActiveChatId}`);
          setMessages(currentMessages.length > 0 ? currentMessages : initialMessages);
        }
      }, 5000); // Check every 5 seconds (reduced frequency)

      return () => clearInterval(interval);
    }
  }, [effectiveActiveChatId, isLoadingRemoteMessages, messages.length, getCachedMessages]);

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
    console.log(`[ChatUI] 🔄 Updated activeChatIdRef to: ${effectiveActiveChatId}`);
    
    // If we switch to a different session while streaming, clear UI state
    if (streamingSessionId && streamingSessionId !== effectiveActiveChatId) {
      console.log(`[ChatUI] Clearing streaming UI state - switched from ${streamingSessionId} to ${effectiveActiveChatId}`);
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingMessageId(null);
      setStreamingAgent(undefined);
      setStatusMessages([]);
      // Don't clear streamingSessionId here - let it complete in background
    }
  }, [effectiveActiveChatId, streamingSessionId]);

  // REMOVED: Request cancellation useEffect for background processing

  // Cleanup streaming on unmount or chat change
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
        streamControllerRef.current = null;
      }
    };
  }, [effectiveActiveChatId]);

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
            console.log('[ChatUI] Token received:', JSON.stringify(token), 'accumulated length:', accumulatedContentRef.current.length);
            
            // DEBUG: Add to debug panel
            setDebugStreamData(prev => ({
              ...prev,
              tokens: [...prev.tokens, token],
              raw: prev.raw + token
            }));
            
            // Accumulate content in ref
            accumulatedContentRef.current += token;
            const currentContent = accumulatedContentRef.current;
            
            // Update streaming state
            setStreamingMessage(currentContent);
            
            // Debug: log the accumulated content
            const hasNonEmptyContent = currentContent.trim().length > 0;
            console.log('[ChatUI] Content check - hasNonEmptyContent:', hasNonEmptyContent);
            
            // Don't update messages/displayedMessages during streaming
            // We'll use streamingMessage state directly in the render
            console.log('[ChatUI] Streaming content updated:', currentContent.length, 'chars');
          },
          onStatus: (data: { type: string; message: string; metadata?: any }) => {
            console.log('[ChatUI] Status received:', data);
            setStatusMessages(prev => [...prev, {
              ...data,
              timestamp: new Date()
            }]);
          },
          onDone: async (data: { agent?: string; orchestration?: any }) => {
            console.log('[ChatUI] Stream completed:', data);
            
            // DEBUG: Add to debug panel
            setDebugStreamData(prev => ({
              ...prev,
              events: [...prev.events, `DONE: ${JSON.stringify(data)}`],
              raw: prev.raw + `\n[DONE] Total: ${accumulatedContentRef.current.length} chars`
            }));
            
            const finalContent = accumulatedContentRef.current;
            console.log('[ChatUI] Final accumulated content:', finalContent.length, 'chars');
            
            // Create final message object without streaming flag
            const finalMessage: HybridMessage = {
              id: botMessageId,
              content: finalContent || 'I apologize, but I was unable to generate a response.',
              sender: 'bot',
              timestamp: new Date(),
              agent: data.agent || currentStreamingAgent,
              synced: false,
              isStreaming: false // Remove streaming flag
            };
            
            // Update the message one final time with complete agent info
            setMessages(msgs => msgs.map(msg => 
              msg.id === botMessageId ? finalMessage : msg
            ));
            setDisplayedMessages(msgs => msgs.map(msg => 
              msg.id === botMessageId ? finalMessage : msg
            ));
            
            // Save to hybrid storage
            try {
              await saveChatMessage(originatingSessionId, finalMessage);
              // Update message count
              markChatNewMessage(originatingSessionId, true, activeChatIdRef.current);
              // Mark as read immediately
              if (originatingSessionId === activeChatIdRef.current) {
                await markChatAsRead(originatingSessionId);
                console.log(`[ChatUI] Marked streaming session as read: ${originatingSessionId}`);
              }
            } catch (error) {
              console.error('[ChatUI] Error saving message:', error);
            }
            
            // Clean up streaming state
            setIsStreaming(false);
            setStreamingSessionId(null); // Clear streaming session
            setStreamingMessageId(null); // Clear streaming message
            setChatLoading(originatingSessionId, false);
            setStreamingMessage('');
            setStatusMessages([]); // Clear status messages after streaming
            accumulatedContentRef.current = ''; // Clear accumulated content
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
            
            setIsStreaming(false);
            setStreamingSessionId(null); // Clear streaming session
            setStreamingMessageId(null); // Clear streaming message
            setChatLoading(originatingSessionId, false);
            setStatusMessages([]); // Clear status messages on error
          }
        }
      };
      
      // Add slash command metadata if present
      if (pendingSlashCommand) {
        options.slashCommand = pendingSlashCommand;
        delete (window as any).__pendingSlashCommand;
      }
      
      // Start streaming
      streamControllerRef.current = sendChatMessageStream(currentInput, originatingSessionId, options);
      
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

  // formatTime is used in MessageItem component

  // Progressive message display for better performance
  const INITIAL_MESSAGE_COUNT = 50;
  
  // Update displayed messages when messages change
  useEffect(() => {
    // CRITICAL: Don't sync during streaming - it will wipe out the placeholder!
    if (isStreaming) {
      console.log('[ChatUI] Skipping displayedMessages sync - streaming in progress');
      return;
    }
    
    console.log('[ChatUI] Syncing displayedMessages, messages.length:', messages.length, 'isStreaming:', isStreaming);
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
      console.log('[ChatUI] Setting all messages to displayed');
      setDisplayedMessages(messages);
    } else {
      // Show only recent messages initially (the backend already returns the most recent 50)
      console.log('[ChatUI] Setting last', INITIAL_MESSAGE_COUNT, 'messages to displayed');
      setDisplayedMessages(messages.slice(-INITIAL_MESSAGE_COUNT));
    }
  }, [messages, hasLoadedMore, currentChat?.messageCount, isLoadingMore, isStreaming]);
  
  // Force scroll to bottom when messages are updated during initial load
  useEffect(() => {
    if (isLoadingMore) {
      console.log('[ChatUI] Skipping auto-scroll - load more in progress');
      return;
    }
    
    if (!isScrollReady && displayedMessages.length > 0 && messagesContainerRef.current) {
      // Use setTimeout to ensure DOM has updated
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

  // Ensure scroll stays at bottom when displayed messages change
  useEffect(() => {
    if (isLoadingMore || hasLoadedMore) {
      console.log('[ChatUI] Skipping bottom auto-scroll - load more operation');
      return;
    }
    
    if (isScrollReady && !isInitialLoad && displayedMessages.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
          
          // Auto-scroll if near bottom or if the last message is from the user
          const lastMessage = displayedMessages[displayedMessages.length - 1];
          if (isNearBottom || lastMessage?.sender === 'user') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
      });
    }
  }, [displayedMessages, isScrollReady, isInitialLoad, isLoadingMore, hasLoadedMore]);

  // DEBUG: Log render
  console.log('[RENDER] ChatUI rendering, streamingMessage length:', streamingMessage.length, 'isStreaming:', isStreaming);
  
  return (
    <ChatSettingsProvider sessionId={effectiveActiveChatId || 'default'}>
      <div className="h-full flex">
        {/* Main chat container */}
        <div className="flex-1 flex flex-col backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
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
          // Don't hide during load more operations
          (isScrollReady || isLoadingMore) ? "opacity-100" : "opacity-0 pointer-events-none"
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
            
            // For the streaming message, override content with live streaming data
            const isStreamingMessage = isStreaming && 
                                      streamingSessionId === effectiveActiveChatId && 
                                      streamingMessageId === msg.id;
            
            // DEBUG: Log streaming detection
            if (msg.sender === 'bot' && isStreaming) {
              console.log('[RENDER] Streaming check for bot msg:', {
                msgId: msg.id,
                streamingMessageId,
                isMatch: msg.id === streamingMessageId,
                isStreamingMessage,
                streamingContent: streamingMessage.substring(0, 30) + '...'
              });
            }
            
            const displayMessage = isStreamingMessage ? {
              ...msg,
              content: streamingMessage,  // Use live streaming content
              isStreaming: true,
              agent: streamingAgent || msg.agent
            } : msg;
            
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
    
    {/* DEBUG PANEL - TEMPORARY */}
    {isStreaming && streamingSessionId === effectiveActiveChatId && (
      <div className="w-96 ml-4 flex flex-col backdrop-blur-xl bg-red-500/10 dark:bg-red-900/10 rounded-2xl border-2 border-red-500/50 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-red-500/30 bg-red-500/20">
          <h3 className="font-bold text-red-700 dark:text-red-300">🔴 DEBUG: Stream Monitor</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">TEMPORARY - Remove before production</p>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Raw accumulated content */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Raw Stream Output:</h4>
            <div className="p-3 bg-black/20 rounded-lg font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
              {debugStreamData.raw || '[No data yet...]'}
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">
              Total chars: {debugStreamData.raw.length}
            </p>
          </div>
          
          {/* Token list */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Tokens ({debugStreamData.tokens.length}):</h4>
            <div className="max-h-40 overflow-y-auto p-3 bg-black/20 rounded-lg space-y-1">
              {debugStreamData.tokens.map((token, i) => (
                <div key={i} className="font-mono text-xs text-blue-400">
                  [{i}] "{token}" ({token.length} chars)
                </div>
              ))}
              {debugStreamData.tokens.length === 0 && (
                <p className="text-xs text-gray-500">[No tokens received yet]</p>
              )}
            </div>
          </div>
          
          {/* Events */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Events:</h4>
            <div className="max-h-32 overflow-y-auto p-3 bg-black/20 rounded-lg space-y-1">
              {debugStreamData.events.map((event, i) => (
                <div key={i} className="font-mono text-xs text-yellow-400">
                  {event}
                </div>
              ))}
              {debugStreamData.events.length === 0 && (
                <p className="text-xs text-gray-500">[No events yet]</p>
              )}
            </div>
          </div>
          
          {/* State info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Stream State:</h4>
            <div className="p-3 bg-black/20 rounded-lg text-xs space-y-1">
              <p className="text-orange-400">isStreaming: {isStreaming ? 'true' : 'false'}</p>
              <p className="text-orange-400">streamingAgent: {streamingAgent || 'none'}</p>
              <p className="text-orange-400">accumulatedContentRef: {accumulatedContentRef.current.length} chars</p>
              <p className="text-orange-400">streamingMessage length: {streamingMessage.length}</p>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
    </ChatSettingsProvider>
  );
}; 