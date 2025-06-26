import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getChatHistory, 
  ChatMessage, 
  loadMessagesFromRemote, 
  getAllChats,
  deleteChat as deleteChatAPI,
  ChatMetadata 
} from '../api/chat';

// Chat interface definition - enhanced for remote storage
export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  isLoading: boolean;           // tracks if chat has pending requests
  hasNewMessages: boolean;      // tracks if chat has unread messages
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
  sender: 'user' | 'bot';
  timestamp: Date;
  agent?: string;
  synced: boolean;        // tracks if message is synced with backend
  compressed?: boolean;   // tracks if message content is compressed
  batchId?: string;      // for message batching
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
  markChatNewMessage: (id: string, hasNew: boolean) => void;
  clearNewMessages: (id: string) => void;
  syncChatWithBackend: (id: string) => Promise<void>;
  getChatMessages: (id: string) => Promise<HybridMessage[]>;
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
const convertMetadataToChat = (metadata: ChatMetadata): Chat => ({
  ...metadata,
  isLoading: false,
  hasNewMessages: false,
  isSynced: true,
  isLoadingMessages: false,
  remoteMessageCount: metadata.messageCount,
  agentHistory: [],
});

// ChatManager Provider component
export const ChatManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      
      if (remoteChats.length === 0) {
        // Create a default local chat if none exist
        const defaultChat: Chat = {
          id: crypto.randomUUID(),
          title: 'New Chat',
          createdAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 0,
          isLoading: false,
          hasNewMessages: false,
          isSynced: false,
          isLoadingMessages: false,
          remoteMessageCount: 0,
          agentHistory: [],
        };
        setChats([defaultChat]);
        setActiveChatId(defaultChat.id);
      } else {
        setChats(remoteChats.map(convertMetadataToChat));
        // Set active chat to the first one if not set
        if (!activeChatId && remoteChats.length > 0) {
          setActiveChatId(remoteChats[0].id);
        }
      }
    } catch (error) {
      console.error('[ChatManager] Failed to load chats:', error);
      // Create a default local chat on error
      const defaultChat: Chat = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        createdAt: new Date(),
        lastMessageAt: new Date(),
        messageCount: 0,
        isLoading: false,
        hasNewMessages: false,
        isSynced: false,
        isLoadingMessages: false,
        remoteMessageCount: 0,
        agentHistory: [],
      };
      setChats([defaultChat]);
      setActiveChatId(defaultChat.id);
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
    updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages' | 'isSynced' | 'lastSyncAt' | 'isLoadingMessages' | 'remoteMessageCount' | 'agentType' | 'agentHistory'>>
  ): void => {
    setChats(prevChats => 
      prevChats.map(chat => (chat.id === id ? { ...chat, ...updates } : chat))
    );
  }, []);

  // Clear new message indicator
  const clearNewMessages = useCallback((id: string): void => {
    updateChatMetadata(id, { hasNewMessages: false });
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
      
      // Update chat metadata
      updateChatMetadata(id, { 
        isLoadingMessages: false,
        remoteMessageCount: messages.length,
        messageCount: messages.length
      });
      
      return messages;
    } catch (error) {
      console.error(`[ChatManager] Failed to load messages for chat ${id}:`, error);
      updateChatMetadata(id, { isLoadingMessages: false });
      return [];
    }
  }, [updateChatMetadata]);

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
    
    // Update chat metadata
    updateChatMetadata(id, {
      lastMessageAt: message.timestamp,
      messageCount: (chats.find(c => c.id === id)?.messageCount || 0) + 1,
      remoteMessageCount: (chats.find(c => c.id === id)?.remoteMessageCount || 0) + 1,
      isSynced: true,
    });
    
    console.log(`[ChatManager] Updated metadata for chat ${id}`);
  }, [chats, trackAgentUsage, updateChatMetadata]);

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

  // Create a new chat locally (will auto-create on server when first message is sent)
  const createChat = useCallback(async (title?: string): Promise<string> => {
    const optimisticId = crypto.randomUUID();
    const optimisticChat: Chat = {
      id: optimisticId,
      title: title || 'New Chat',
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
      isLoading: false,
      hasNewMessages: false,
      isSynced: false,
      isLoadingMessages: false,
      remoteMessageCount: 0,
      agentHistory: [],
    };
    
    // Add chat locally
    setChats(prevChats => [...prevChats, optimisticChat]);
    setActiveChatId(optimisticId);
    
    console.log(`[ChatManager] Created new local chat: ${optimisticId}`);
    return optimisticId;
  }, []);

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
    clearNewMessages(id);
  }, [clearNewMessages]);

  // Set chat loading state
  const setChatLoading = useCallback((id: string, isLoading: boolean): void => {
    updateChatMetadata(id, { isLoading });
  }, [updateChatMetadata]);

  // Mark chat as having new messages
  const markChatNewMessage = useCallback((id: string, hasNew: boolean): void => {
    // Only mark as new if it's not the active chat
    if (id !== activeChatId) {
      updateChatMetadata(id, { hasNewMessages: hasNew });
    }
  }, [activeChatId, updateChatMetadata]);

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