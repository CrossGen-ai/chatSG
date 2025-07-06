import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getChatHistory, 
  ChatMessage, 
  loadMessagesFromRemote, 
  getAllChats,
  deleteChat as deleteChatAPI,
  ChatMetadata,
  markChatAsRead,
  createChat as createChatAPI
} from '../api/chat';
import { useAuth } from '../hooks/useAuth';

// Chat interface definition - enhanced for remote storage
export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  isLoading: boolean;           // tracks if chat has pending requests
  hasNewMessages: boolean;      // tracks if chat has unread messages
  unreadCount: number;         // number of unread messages from backend
  lastReadAt: Date | null;     // when chat was last marked as read
  isSynced: boolean;           // tracks if chat is synced with backend
  lastSyncAt?: Date;           // last time chat was synced with backend
  isLoadingMessages: boolean;  // tracks if messages are being loaded from remote
  remoteMessageCount: number;  // number of messages stored remotely
  agentType?: string;          // current/last responding agent type for dynamic avatars
  agentHistory?: string[];     // history of agents used in this chat
}

// Message interface for remote storage
export interface HybridMessage {
  id: number;
  content: string;
  sender: 'user' | 'bot' | 'tool';
  timestamp: Date;
  agent?: string;
  synced: boolean;        // tracks if message is synced with backend
  compressed?: boolean;   // tracks if message content is compressed
  batchId?: string;      // for message batching
  isStreaming?: boolean;  // tracks if message is currently streaming
  memoryStatus?: {        // memory retrieval status for bot messages
    enabled: boolean;
    memoryCount: number;
    status: 'loaded' | 'timeout' | 'empty' | 'error';
    retrievalTime?: number;
    errorMessage?: string;
  };
  toolExecution?: {       // for tool status messages
    id: string;
    toolName: string;
    status: 'starting' | 'running' | 'completed' | 'error';
    parameters?: any;
    result?: any;
    error?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    agentName?: string;
    isExpanded?: boolean;
  };
}

// ChatManager context interface - enhanced
interface ChatManagerContextType {
  chats: Chat[];
  activeChatId: string;
  isLoadingChats: boolean;          // NEW: Loading state for chat list
  isCreatingChat: boolean;          // NEW: Loading state for chat creation
  isDeletingChat: string | null;    // NEW: Chat ID being deleted or null
  createChat: (title?: string) => Promise<string>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  switchChat: (id: string) => void;
  updateChatMetadata: (id: string, updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages' | 'isSynced' | 'lastSyncAt' | 'isLoadingMessages' | 'remoteMessageCount' | 'agentType' | 'agentHistory'>>) => void;
  setChatLoading: (id: string, isLoading: boolean) => void;
  markChatNewMessage: (id: string, hasNew: boolean, actualActiveChatId?: string) => void;
  clearNewMessages: (id: string) => void;
  syncChatWithBackend: (id: string) => Promise<void>;
  getChatMessages: (id: string) => Promise<HybridMessage[]>;
  loadMoreChatMessages: (id: string, currentMessageCount: number) => Promise<HybridMessage[]>;  // NEW: Load more messages with pagination
  getCachedMessages: (id: string) => HybridMessage[];  // NEW: Get cached messages synchronously
  saveChatMessage: (id: string, message: HybridMessage) => Promise<void>;
  markChatSynced: (id: string, synced: boolean) => void;
  trackAgentUsage: (id: string, agentType?: string) => void;
  refreshChats: () => Promise<void>;  // NEW: Refresh chat list from server
}

// Create context
const ChatManagerContext = createContext<ChatManagerContextType | undefined>(undefined);

// Message cache to avoid redundant API calls
const messageCache = new Map<string, { messages: HybridMessage[], timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

// Helper function to convert ChatMessage to HybridMessage
const convertToHybridMessage = (apiMessage: ChatMessage): HybridMessage => ({
  id: apiMessage.id,
  content: apiMessage.content,
  sender: apiMessage.type === 'user' ? 'user' : 'bot',
  timestamp: new Date(apiMessage.timestamp),
  agent: apiMessage.agent,
  synced: true, // Messages from API are considered synced
});

// Helper function to convert HybridMessage to ChatMessage format
const convertToApiMessage = (hybridMessage: HybridMessage): ChatMessage => ({
  id: hybridMessage.id,
  content: hybridMessage.content,
  type: hybridMessage.sender,
  timestamp: hybridMessage.timestamp.toISOString(),
  agent: hybridMessage.agent,
});

// Helper function to convert ChatMetadata to Chat
const convertMetadataToChat = (metadata: ChatMetadata): Chat => {
  const converted = {
    ...metadata,
    isLoading: false,
    hasNewMessages: false,  // Start with false, will be set by markChatNewMessage when needed
    unreadCount: metadata.unreadCount || 0,
    lastReadAt: metadata.lastReadAt || null,
    isSynced: true,
    isLoadingMessages: false,
    remoteMessageCount: metadata.messageCount,
    agentHistory: [],
  };
  console.log(`[convertMetadataToChat] Converting ${metadata.id}: unreadCount=${metadata.unreadCount}, hasNewMessages=${converted.hasNewMessages}`);
  return converted;
};

// ChatManager Provider component
export const ChatManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null);
  
  // Track sync status for background operations
  const [syncInProgress, setSyncInProgress] = useState<Set<string>>(new Set());

  // Load chats from server on mount
  const refreshChats = useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const { chats: remoteChats } = await getAllChats();
      console.log('[ChatManager] Loaded chats from server:', remoteChats);
      
      if (remoteChats.length === 0) {
        // No chats exist - show empty state
        setChats([]);
        setActiveChatId('');
      } else {
        const convertedChats = remoteChats.map(convertMetadataToChat);
        console.log('[ChatManager] Converted chats:', convertedChats);
        setChats(convertedChats);
        // Set active chat to the first one if not set
        if (!activeChatId && remoteChats.length > 0) {
          setActiveChatId(remoteChats[0].id);
        }
      }
    } catch (error) {
      console.error('[ChatManager] Failed to load chats:', error);
      // Show empty state on error
      setChats([]);
      setActiveChatId('');
    } finally {
      setIsLoadingChats(false);
    }
  }, [activeChatId]);

  // Initial load
  useEffect(() => {
    refreshChats();
  }, []);

  // Ensure we have a valid active chat
  useEffect(() => {
    if (chats.length > 0 && !chats.find(chat => chat.id === activeChatId)) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // Update chat metadata
  const updateChatMetadata = useCallback((
    id: string, 
    updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages' | 'unreadCount' | 'lastReadAt' | 'isSynced' | 'lastSyncAt' | 'isLoadingMessages' | 'remoteMessageCount' | 'agentType' | 'agentHistory'>>
  ): void => {
    console.log(`[updateChatMetadata] Updating ${id}:`, updates);
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === id) {
          const updatedChat = { ...chat, ...updates };
          // Only log significant changes (when values actually change)
          if (chat.hasNewMessages !== updatedChat.hasNewMessages || chat.unreadCount !== updatedChat.unreadCount) {
            console.log(`[updateChatMetadata] Chat ${id} updated - hasNewMessages: ${chat.hasNewMessages} -> ${updatedChat.hasNewMessages}, unreadCount: ${chat.unreadCount} -> ${updatedChat.unreadCount}`);
          }
          return updatedChat;
        }
        return chat;
      })
    );
  }, []);

  // Clear new message indicator
  const clearNewMessages = useCallback((id: string): void => {
    updateChatMetadata(id, { 
      hasNewMessages: false, 
      unreadCount: 0,
      lastReadAt: new Date()
    });
  }, [updateChatMetadata]);

  // Get chat messages from remote storage
  const getChatMessages = useCallback(async (id: string): Promise<HybridMessage[]> => {
    // Check cache first
    const cached = messageCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.messages;
    }

    // Update loading state
    updateChatMetadata(id, { isLoadingMessages: true });

    try {
      const history = await getChatHistory(id);
      const messages = history.messages.map(convertToHybridMessage);
      
      // Update cache
      messageCache.set(id, { messages, timestamp: Date.now() });
      
      // Update chat metadata - use totalMessages for the actual count
      updateChatMetadata(id, { 
        isLoadingMessages: false,
        remoteMessageCount: history.totalMessages, // Total messages in backend
        messageCount: history.totalMessages // Display total count in sidebar
      });
      
      return messages;
    } catch (error) {
      console.error(`[ChatManager] Failed to load messages for chat ${id}:`, error);
      updateChatMetadata(id, { isLoadingMessages: false });
      return [];
    }
  }, [updateChatMetadata]);

  // Load additional messages with pagination
  const loadMoreChatMessages = useCallback(async (id: string, currentMessageCount: number): Promise<HybridMessage[]> => {
    try {
      // Get chat metadata to know total message count
      const chat = chats.find(c => c.id === id);
      if (!chat) {
        console.error(`[ChatManager] Chat ${id} not found`);
        return [];
      }
      
      // Backend returns messages in descending order (newest first)
      // To get older messages, we need to skip the ones we already have
      // Since we initially load the most recent 50, we need to get the next batch
      const offset = currentMessageCount;
      const limit = 50;
      
      console.log(`[ChatManager] Loading more messages for ${id}: offset=${offset}, limit=${limit}, totalMessages=${chat.remoteMessageCount}`);
      
      const history = await getChatHistory(id, { offset, limit });
      const olderMessages = history.messages.map(convertToHybridMessage);
      
      console.log(`[ChatManager] Received ${olderMessages.length} older messages from backend`);
      
      // Get existing cached messages
      const cached = messageCache.get(id);
      const existingMessages = cached ? cached.messages : [];
      
      // Since backend returns messages in descending order (newest first),
      // and we're getting older messages, we need to append them to existing messages
      const allMessages = [...existingMessages, ...olderMessages];
      
      // Update cache with all messages
      messageCache.set(id, { messages: allMessages, timestamp: Date.now() });
      
      console.log(`[ChatManager] Merged messages - existing: ${existingMessages.length}, new: ${olderMessages.length}, total: ${allMessages.length}`);
      
      return allMessages;
    } catch (error) {
      console.error(`[ChatManager] Failed to load more messages for chat ${id}:`, error);
      // Return existing messages on error
      const cached = messageCache.get(id);
      return cached ? cached.messages : [];
    }
  }, [chats]);

  // Track agent usage and update chat metadata
  const trackAgentUsage = useCallback((id: string, agentType?: string): void => {
    if (!agentType) return;
    
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === id) {
          const updatedHistory = chat.agentHistory || [];
          
          // Only add to history if it's a different agent
          if (chat.agentType !== agentType) {
            updatedHistory.push(agentType);
            
            // Keep only the last 10 agents to prevent excessive memory usage
            if (updatedHistory.length > 10) {
              updatedHistory.splice(0, updatedHistory.length - 10);
            }
          }
          
          return {
            ...chat,
            agentType,
            agentHistory: updatedHistory
          };
        }
        return chat;
      })
    );
    
    console.log(`[ChatManager] Tracked agent usage: ${agentType} for chat ${id}`);
  }, []);

  // Save chat message (messages are now saved automatically by /api/chat endpoint)
  const saveChatMessage = useCallback(async (id: string, message: HybridMessage): Promise<void> => {
    // Update cache instead of deleting it
    const cached = messageCache.get(id);
    if (cached) {
      // Add the new message to the cached messages
      const updatedMessages = [...cached.messages, message];
      messageCache.set(id, { messages: updatedMessages, timestamp: Date.now() });
    }
    
    // Track agent usage if it's a bot message with agent info
    if (message.sender === 'bot' && message.agent) {
      trackAgentUsage(id, message.agent);
    }
    
    // Update chat metadata - but don't overwrite hasNewMessages for background chats
    const currentChat = chats.find(c => c.id === id);
    const updates: any = {
      lastMessageAt: message.timestamp,
      messageCount: (currentChat?.messageCount || 0) + 1,
      remoteMessageCount: (currentChat?.remoteMessageCount || 0) + 1,
      isSynced: true,
    };
    
    // Preserve hasNewMessages and unreadCount if this is not the active chat
    if (id !== activeChatId && currentChat?.hasNewMessages) {
      updates.hasNewMessages = true;
      updates.unreadCount = currentChat.unreadCount;
    }
    
    updateChatMetadata(id, updates);
    
    console.log(`[ChatManager] Updated metadata for chat ${id}`);
  }, [chats, trackAgentUsage, updateChatMetadata, activeChatId]);

  // Mark chat as synced/unsynced
  const markChatSynced = useCallback((id: string, synced: boolean): void => {
    updateChatMetadata(id, {
      isSynced: synced,
      lastSyncAt: synced ? new Date() : undefined,
    });
  }, [updateChatMetadata]);

  // Sync chat with backend
  const syncChatWithBackend = useCallback(async (id: string): Promise<void> => {
    if (syncInProgress.has(id)) {
      console.log(`[ChatManager] Sync already in progress for chat ${id}`);
      return;
    }

    setSyncInProgress(prev => new Set(prev).add(id));
    
    try {
      console.log(`[ChatManager] Starting sync for chat ${id}`);
      
      // For now, just refresh the messages from the server
      await getChatMessages(id);
      
      markChatSynced(id, true);
      console.log(`[ChatManager] Successfully synced chat ${id}`);
      
    } catch (error) {
      console.warn(`[ChatManager] Failed to sync chat ${id} with backend:`, error);
      markChatSynced(id, false);
    } finally {
      setSyncInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [syncInProgress, getChatMessages, markChatSynced]);

  // Create a new chat on backend immediately
  const createChat = useCallback(async (title?: string): Promise<string> => {
    setIsCreatingChat(true);
    
    try {
      // Call backend API to create chat
      const response = await createChatAPI({
        title: title || 'New Chat',
        metadata: {}
      });
      
      const newChat: Chat = {
        id: response.sessionId,
        title: response.session.title,
        createdAt: new Date(response.session.createdAt),
        lastMessageAt: new Date(response.session.createdAt),
        messageCount: response.session.messageCount,
        isLoading: false,
        hasNewMessages: false,
        unreadCount: 0,
        lastReadAt: null,
        isSynced: true,
        isLoadingMessages: false,
        remoteMessageCount: response.session.messageCount,
        agentHistory: [],
      };
      
      // Add chat to state
      setChats(prevChats => [...prevChats, newChat]);
      setActiveChatId(response.sessionId);
      
      console.log(`[ChatManager] Created chat on backend: ${response.sessionId}`);
      return response.sessionId;
    } catch (error) {
      console.error('[ChatManager] Failed to create chat:', error);
      throw error;
    } finally {
      setIsCreatingChat(false);
    }
  }, [user]);

  // Delete a chat with optimistic update and rollback
  const deleteChat = useCallback(async (id: string): Promise<void> => {
    setIsDeletingChat(id);
    
    // Store the chat for potential rollback
    const chatToDelete = chats.find(c => c.id === id);
    const previousActiveId = activeChatId;
    
    // Optimistic update - remove immediately
    setChats(prevChats => {
      const newChats = prevChats.filter(chat => chat.id !== id);
      
      // If we're deleting the active chat, switch to another one
      if (activeChatId === id && newChats.length > 0) {
        setActiveChatId(newChats[0].id);
      }
      
      return newChats;
    });
    
    // Clear cache optimistically
    messageCache.delete(id);
    
    try {
      await deleteChatAPI(id);
      console.log(`[ChatManager] Deleted chat: ${id}`);
    } catch (error) {
      console.error(`[ChatManager] Failed to delete chat ${id}:`, error);
      
      // Rollback on error
      if (chatToDelete) {
        setChats(prevChats => [...prevChats, chatToDelete]);
        setActiveChatId(previousActiveId);
        // Note: message cache was already cleared, would need to reload messages
      }
      
      throw error;
    } finally {
      setIsDeletingChat(null);
    }
  }, [activeChatId, chats]);

  // Rename a chat
  const renameChat = useCallback(async (id: string, title: string): Promise<void> => {
    // Update locally first (optimistic update)
    setChats(prevChats =>
      prevChats.map(chat => (chat.id === id ? { ...chat, title } : chat))
    );
    
    // TODO: Implement rename endpoint on backend
    console.log(`[ChatManager] Renamed chat ${id} to: ${title}`);
  }, []);

  // Switch active chat
  const switchChat = useCallback((id: string): void => {
    console.log(`[ChatManager] Switching to chat: ${id}`);
    setActiveChatId(id);
    
    // Mark chat as read in backend
    const markAsRead = async () => {
      try {
        await markChatAsRead(id);
        console.log(`[ChatManager] Marked chat ${id} as read`);
      } catch (error) {
        console.error(`[ChatManager] Failed to mark chat ${id} as read:`, error);
      }
    };
    
    // Clear locally and mark as read on backend
    clearNewMessages(id);
    markAsRead();
  }, [clearNewMessages]);

  // Set chat loading state
  const setChatLoading = useCallback((id: string, isLoading: boolean): void => {
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === id) {
          // Only update isLoading, preserve other state
          console.log(`[setChatLoading] Setting loading=${isLoading} for ${id}, preserving hasNewMessages=${chat.hasNewMessages}`);
          return { ...chat, isLoading };
        }
        return chat;
      })
    );
  }, []);

  // Mark chat as having new messages
  const markChatNewMessage = useCallback((id: string, hasNew: boolean, actualActiveChatId?: string): void => {
    // Use passed actualActiveChatId or fall back to activeChatId from state
    const effectiveActiveChatId = actualActiveChatId || activeChatId;
    console.log(`[useChatManager] markChatNewMessage called - id: ${id}, hasNew: ${hasNew}, actualActiveChatId: ${actualActiveChatId}, activeChatId from state: ${activeChatId}, using: ${effectiveActiveChatId}`);
    
    // Only mark as new if it's not the active chat
    if (id !== effectiveActiveChatId) {
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => c.id === id);
        console.log(`[useChatManager] Chat found at index:`, chatIndex);
        
        if (chatIndex !== -1) {
          const chat = prevChats[chatIndex];
          const newMessageCount = (chat.messageCount || 0) + 1;
          console.log(`[useChatManager] Updating metadata - hasNewMessages: ${hasNew}, messageCount: ${chat.messageCount} -> ${newMessageCount}`);
          
          // Create a new array with a new object to ensure React detects the change
          const newChats = [...prevChats];
          newChats[chatIndex] = {
            ...chat,
            hasNewMessages: hasNew,  // Directly set based on hasNew parameter
            unreadCount: hasNew ? (chat.unreadCount || 0) + 1 : 0,
            messageCount: newMessageCount,
            lastMessageAt: new Date()
          };
          console.log(`[useChatManager] Updated chat:`, newChats[chatIndex]);
          return newChats;
        } else {
          console.log(`[useChatManager] Chat not found for id: ${id}`);
          return prevChats;
        }
      });
    } else {
      console.log(`[useChatManager] Not marking as new - this is the active chat`);
      // For active chat, just increment the message count
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => c.id === id);
        if (chatIndex !== -1) {
          const chat = prevChats[chatIndex];
          const newChats = [...prevChats];
          newChats[chatIndex] = {
            ...chat,
            hasNewMessages: false,  // Active chat should never show blue dot
            messageCount: (chat.messageCount || 0) + 1,
            lastMessageAt: new Date()
          };
          console.log(`[useChatManager] Updated active chat message count:`, newChats[chatIndex].messageCount);
          return newChats;
        }
        return prevChats;
      });
    }
  }, [activeChatId]);

  // Get cached messages synchronously (no API call)
  const getCachedMessages = useCallback((id: string): HybridMessage[] => {
    const cached = messageCache.get(id);
    return cached ? cached.messages : [];
  }, []);

  // Context value
  const contextValue: ChatManagerContextType = {
    chats,
    activeChatId,
    isLoadingChats,
    isCreatingChat,
    isDeletingChat,
    createChat,
    deleteChat,
    renameChat,
    switchChat,
    updateChatMetadata,
    setChatLoading,
    markChatNewMessage,
    clearNewMessages,
    syncChatWithBackend,
    getChatMessages,
    loadMoreChatMessages,
    getCachedMessages,
    saveChatMessage,
    markChatSynced,
    trackAgentUsage,
    refreshChats,
  };

  return (
    <ChatManagerContext.Provider value={contextValue}>
      {children}
    </ChatManagerContext.Provider>
  );
};

// Custom hook to use the ChatManager context
export const useChatManager = () => {
  const context = useContext(ChatManagerContext);
  if (!context) {
    throw new Error('useChatManager must be used within a ChatManagerProvider');
  }
  return context;
};