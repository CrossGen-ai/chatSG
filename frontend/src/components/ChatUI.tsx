import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { sendChatMessage } from '../api/chat';
import { useChatManager } from '../hooks/useChatManager';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatUIProps {
  sessionId?: string;
}

const initialMessages: Message[] = [
  { 
    id: 1, 
    content: 'Hello! I\'m your AI assistant. How can I help you today? Feel free to ask me anything!', 
    sender: 'bot',
    timestamp: new Date()
  },
];

const BotAvatar = () => (
  <div className="w-8 h-8 rounded-full theme-accent flex items-center justify-center shadow-lg flex-shrink-0">
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  </div>
);

const UserAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-center space-x-2 p-4">
    <BotAvatar />
    <div className="backdrop-blur-md bg-white/60 dark:bg-black/40 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-white/20">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  </div>
);

export const ChatUI: React.FC<ChatUIProps> = ({ sessionId }) => {
  const { activeChatId, updateChatMetadata, chats, setChatLoading, markChatNewMessage } = useChatManager();
  const currentSessionId = sessionId || activeChatId;
  const currentChat = chats.find(chat => chat.id === currentSessionId);
  
  // Create a ref to track the current active session for async operations
  // 🚨 CRITICAL: DO NOT REMOVE - Required for race condition fix
  // Without this useEffect, the ref becomes stale and race condition returns
  // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
  const currentActiveSessionRef = useRef(currentSessionId);
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingRequests, setPendingRequests] = useState<Map<string, AbortController>>(new Map());

  // Remove global loading state, use per-chat loading from context
  const loading = currentChat?.isLoading || false;

  // Save messages to localStorage
  const saveMessages = (sessionId: string, messages: Message[]) => {
    try {
      localStorage.setItem(`chat-messages-${sessionId}`, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save messages to localStorage:', error);
    }
  };

  // Load messages from localStorage
  const loadMessages = (sessionId: string): Message[] => {
    try {
      const saved = localStorage.getItem(`chat-messages-${sessionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load messages from localStorage:', error);
    }
    return initialMessages;
  };

  // Load messages when sessionId changes
  useEffect(() => {
    console.log(`[ChatUI] useEffect: Loading messages for session change: ${currentSessionId}`);
    if (currentSessionId) {
      const loadedMessages = loadMessages(currentSessionId);
      setMessages(loadedMessages);
      console.log(`[ChatUI] useEffect: Loaded ${loadedMessages.length} messages for session: ${currentSessionId}`);
    }
  }, [currentSessionId]);

  // Save messages when they change
  useEffect(() => {
    console.log(`[ChatUI] useEffect: Messages changed. currentSessionId: ${currentSessionId}, messages.length: ${messages.length}`);
    if (currentSessionId && messages.length > 0) {
      console.log(`[ChatUI] useEffect: SAVING ${messages.length} messages to session: ${currentSessionId}`);
      console.log(`[ChatUI] useEffect: Last message content:`, messages[messages.length - 1]?.content);
      saveMessages(currentSessionId, messages);
    }
  }, [currentSessionId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update the ref whenever currentSessionId changes
  // 🚨 CRITICAL: DO NOT REMOVE - Required for race condition fix
  // Without this useEffect, the ref becomes stale and race condition returns
  // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
  useEffect(() => {
    currentActiveSessionRef.current = currentSessionId;
    console.log(`[ChatUI] 🔄 Updated currentActiveSessionRef to: ${currentSessionId}`);
  }, [currentSessionId]);

  // REMOVED: Request cancellation useEffect for background processing

  const sendMessage = async () => {
    if (!input.trim() || loading || !currentSessionId) return;
    
    // CRITICAL FIX: Capture originating session as a STATIC VALUE
    // This prevents the value from changing when user switches chats
    const originatingSessionId = String(currentSessionId);
    console.log(`[ChatUI] 🚀 SENDING MESSAGE - originatingSessionId: ${originatingSessionId}, currentSessionId: ${currentSessionId}`);
    
    const requestId = crypto.randomUUID();
    const abortController = new AbortController();
    
    // Track request
    setPendingRequests(prev => new Map(prev).set(requestId, abortController));
    
    // Set loading state for this specific chat
    setChatLoading(originatingSessionId, true);
    
    const userMessage: Message = {
      id: Date.now(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    // CRITICAL FIX: Save user message immediately to correct localStorage
    // 🚨 CRITICAL: DO NOT REMOVE - Prevents cross-chat message contamination
    // This prevents cross-chat contamination when users switch chats quickly
    // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
    const currentMessages = loadMessages(originatingSessionId);
    const updatedMessages = [...currentMessages, userMessage];
    saveMessages(originatingSessionId, updatedMessages);
    console.log(`[ChatUI] User message immediately saved to localStorage for session: ${originatingSessionId}`);
    
    // Update current UI with the same messages
    setMessages(updatedMessages);
    const currentInput = input;
    setInput('');
    
    try {
      const botReply = await sendChatMessage(currentInput, originatingSessionId, {
        signal: abortController.signal
      });
      
      // CRITICAL FIX: Use the ref to get the ACTUAL current session at response time
      // 🚨 CRITICAL: DO NOT CHANGE - Must use currentActiveSessionRef.current, not currentSessionId
      // Using currentSessionId here will cause race condition to return
      // See: frontend/RACE_CONDITION_FIX_DOCUMENTATION.md
      const currentSessionAtResponseTime = String(currentActiveSessionRef.current);
      console.log(`[ChatUI] 📥 RESPONSE RECEIVED - originatingSessionId: ${originatingSessionId}, currentSessionId at response time: ${currentSessionAtResponseTime}`);
      console.log(`[ChatUI] 🔍 Session validation: ${originatingSessionId} === ${currentSessionAtResponseTime} ? ${originatingSessionId === currentSessionAtResponseTime}`);
      console.log(`[ChatUI] 🔍 DETAILED COMPARISON:`);
      console.log(`[ChatUI] 🔍   - originatingSessionId: "${originatingSessionId}" (length: ${originatingSessionId.length}, type: ${typeof originatingSessionId})`);
      console.log(`[ChatUI] 🔍   - currentSessionAtResponseTime: "${currentSessionAtResponseTime}" (length: ${currentSessionAtResponseTime.length}, type: ${typeof currentSessionAtResponseTime})`);
      console.log(`[ChatUI] 🔍   - currentActiveSessionRef.current: "${currentActiveSessionRef.current}"`);
      console.log(`[ChatUI] 🔍   - sessionId prop: "${sessionId}"`);
      
      // Session validation before UI update
      if (originatingSessionId === currentSessionAtResponseTime) {
        console.log(`[ChatUI] ✅ ACTIVE CHAT PATH - Adding response to current UI`);
        // Response for currently active chat
        const botMessage: Message = {
          id: Date.now() + 1,
          content: botReply,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages((msgs) => {
          const newMessages = [...msgs, botMessage];
          console.log(`[ChatUI] ✅ ACTIVE: Updated UI with ${newMessages.length} messages for session: ${originatingSessionId}`);
          updateChatMetadata(originatingSessionId, {
            lastMessageAt: new Date(),
            messageCount: newMessages.length
          });
          return newMessages;
        });
        console.log(`[ChatUI] Message delivered to active session: ${originatingSessionId}`);
      } else {
        console.log(`[ChatUI] 🔄 BACKGROUND CHAT PATH - Saving response to localStorage only`);
        // Response for background chat - mark as having new messages
        const backgroundMessages = loadMessages(originatingSessionId);
        const botMessage: Message = {
          id: Date.now() + 1,
          content: botReply,
          sender: 'bot',
          timestamp: new Date()
        };
        const updatedBackgroundMessages = [...backgroundMessages, botMessage];
        saveMessages(originatingSessionId, updatedBackgroundMessages);
        console.log(`[ChatUI] 🔄 BACKGROUND: Saved ${updatedBackgroundMessages.length} messages to localStorage for session: ${originatingSessionId}`);
        console.log(`[ChatUI] 🔄 BACKGROUND: Bot response content:`, botReply);
        
        markChatNewMessage(originatingSessionId, true);
        updateChatMetadata(originatingSessionId, {
          lastMessageAt: new Date(),
          messageCount: updatedBackgroundMessages.length
        });
        console.log(`[ChatUI] Background response received for session: ${originatingSessionId}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[ChatUI] Request cancelled for session: ${originatingSessionId}`);
        return;
      }
      
      // CRITICAL FIX: Use current session at response time for error handling too
      const currentSessionAtResponseTime = String(currentActiveSessionRef.current);
      
      // Handle errors for both active and background chats
      if (originatingSessionId === currentSessionAtResponseTime) {
        const errorMessage: Message = {
          id: Date.now() + 1,
          content: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages((msgs) => [...msgs, errorMessage]);
      } else {
        // Handle error for background chat
        const backgroundMessages = loadMessages(originatingSessionId);
        const errorMessage: Message = {
          id: Date.now() + 1,
          content: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        const updatedBackgroundMessages = [...backgroundMessages, errorMessage];
        saveMessages(originatingSessionId, updatedBackgroundMessages);
        
        updateChatMetadata(originatingSessionId, {
          lastMessageAt: new Date(),
          messageCount: updatedBackgroundMessages.length
        });
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
    <div className="h-full flex flex-col backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
      {/* Chat header */}
      <div className="px-6 py-4 border-b border-white/20 dark:border-white/10 backdrop-blur-md bg-white/20 dark:bg-black/20">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <BotAvatar />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
          </div>
          <div>
            <h3 className="font-semibold theme-text-primary">
              {currentChat?.title || 'AI Assistant'}
            </h3>
            <p className="text-sm theme-text-secondary">Online • Ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={clsx(
              'flex items-end space-x-2 animate-in slide-in-from-bottom-2 duration-300',
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {msg.sender === 'user' ? <UserAvatar /> : <BotAvatar />}
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
              </div>
            </div>
          </div>
        ))}
        
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/20 dark:bg-black/20">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              className="w-full px-4 py-3 rounded-2xl backdrop-blur-md bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/20 theme-text-primary placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type your message..."
              disabled={loading}
            />
          </div>
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
  );
}; 