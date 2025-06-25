import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getChatHistory, ChatMessage, loadMessagesFromRemote, saveMessagesToRemote, syncMessagesWithRemote } from '../api/chat';

// Chat interface definition - enhanced for hybrid storage
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
  isLoadingMessages: boolean;  // NEW: tracks if messages are being loaded from remote
  remoteMessageCount: number;  // NEW: number of messages stored remotely
  localMessageCount: number;   // NEW: number of messages stored locally
  lastRemoteSync?: Date;       // NEW: last time remote messages were synced
  agentType?: string;          // NEW: current/last responding agent type for dynamic avatars
  agentHistory?: string[];     // NEW: history of agents used in this chat
}

// Message interface for hybrid storage
export interface HybridMessage {
  id: number;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  agent?: string;
  synced: boolean;        // tracks if message is synced with backend
  compressed?: boolean;   // NEW: tracks if message content is compressed
  batchId?: string;      // NEW: for message batching
}

// ChatManager context interface - enhanced
interface ChatManagerContextType {
  chats: Chat[];
  activeChatId: string;
  createChat: (title?: string) => string;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  switchChat: (id: string) => void;
  updateChatMetadata: (id: string, updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages' | 'isSynced' | 'lastSyncAt' | 'isLoadingMessages' | 'remoteMessageCount' | 'localMessageCount' | 'lastRemoteSync' | 'agentType' | 'agentHistory'>>) => void;
  setChatLoading: (id: string, isLoading: boolean) => void;
  markChatNewMessage: (id: string, hasNew: boolean) => void;
  clearNewMessages: (id: string) => void;
  syncChatWithBackend: (id: string) => Promise<void>;
  getChatMessages: (id: string) => HybridMessage[];
  saveChatMessage: (id: string, message: HybridMessage) => void;
  markChatSynced: (id: string, synced: boolean) => void;
  trackAgentUsage: (id: string, agentType?: string) => void; // NEW: Agent tracking function
  // NEW: Enhanced hybrid storage functions
  loadMessagesFromRemote: (id: string) => Promise<HybridMessage[]>;
  saveMessagesToRemote: (id: string, messages: HybridMessage[]) => Promise<boolean>;
  getMessagesProgressively: (id: string) => Promise<{ messages: HybridMessage[]; isLoading: boolean }>;
}

// Create context
const ChatManagerContext = createContext<ChatManagerContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  CHATS: 'chatsg-chats',
  ACTIVE_CHAT: 'chatsg-active-chat',
  MESSAGES_PREFIX: 'chat-messages-',      // For local message cache
  METADATA_PREFIX: 'chat-metadata-',      // NEW: For chat metadata only
  REMOTE_SYNC: 'chatsg-remote-sync',      // NEW: For remote sync status
} as const;

// Helper function to safely access localStorage
const getStorageItem = (key: string, fallback: any = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`[ChatManager] Failed to read from localStorage:`, error);
    return fallback;
  }
};

// Helper function to safely write to localStorage
const setStorageItem = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[ChatManager] Failed to write to localStorage:`, error);
  }
};

// Helper function to create a default chat - enhanced
const createDefaultChat = (): Chat => ({
  id: crypto.randomUUID(),
  title: 'New Chat',
  createdAt: new Date(),
  lastMessageAt: new Date(),
  messageCount: 0,
  isLoading: false,
  hasNewMessages: false,
  isSynced: false,
  lastSyncAt: undefined,
  isLoadingMessages: false,    // NEW
  remoteMessageCount: 0,       // NEW
  localMessageCount: 0,        // NEW
  lastRemoteSync: undefined,   // NEW
  agentType: undefined,        // NEW: no agent assigned initially
  agentHistory: [],            // NEW: empty agent history
});

// Helper function to deserialize dates from localStorage - enhanced
const deserializeChat = (chat: any): Chat => ({
  ...chat,
  createdAt: new Date(chat.createdAt),
  lastMessageAt: new Date(chat.lastMessageAt),
  isLoading: chat.isLoading || false,
  hasNewMessages: chat.hasNewMessages || false,
  isSynced: chat.isSynced || false,
  lastSyncAt: chat.lastSyncAt ? new Date(chat.lastSyncAt) : undefined,
  isLoadingMessages: chat.isLoadingMessages || false,           // NEW
  remoteMessageCount: chat.remoteMessageCount || 0,             // NEW
  localMessageCount: chat.localMessageCount || 0,              // NEW
  lastRemoteSync: chat.lastRemoteSync ? new Date(chat.lastRemoteSync) : undefined, // NEW
  agentType: chat.agentType || undefined,                       // NEW
  agentHistory: chat.agentHistory || [],                        // NEW
});

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

// ChatManager Provider component
export const ChatManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from localStorage, following ThemeSwitcher pattern
  const [chats, setChats] = useState<Chat[]>(() => {
    const storedChats = getStorageItem(STORAGE_KEYS.CHATS, []);
    
    // If no chats exist, create a default one
    if (storedChats.length === 0) {
      const defaultChat = createDefaultChat();
      return [defaultChat];
    }
    
    // Deserialize dates from stored chats
    return storedChats.map(deserializeChat);
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const storedActiveId = getStorageItem(STORAGE_KEYS.ACTIVE_CHAT);
    
    // If no active chat stored, use the first chat's ID
    if (!storedActiveId && chats.length > 0) {
      return chats[0].id;
    }
    
    return storedActiveId || '';
  });

  // Track sync status for background operations
  const [syncInProgress, setSyncInProgress] = useState<Set<string>>(new Set());

  // Auto-save chats to localStorage when state changes
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.CHATS, chats);
  }, [chats]);

  // Auto-save active chat ID to localStorage when it changes
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.ACTIVE_CHAT, activeChatId);
  }, [activeChatId]);

  // Ensure we have a valid active chat
  useEffect(() => {
    if (chats.length > 0 && !chats.find(chat => chat.id === activeChatId)) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // NEW: Get chat messages from hybrid storage
  const getChatMessages = (id: string): HybridMessage[] => {
    try {
      const messages = getStorageItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${id}`, []);
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        synced: msg.synced || false,
      }));
    } catch (error) {
      console.warn(`[ChatManager] Failed to load messages for chat ${id}:`, error);
      return [];
    }
  };

  // NEW: Track agent usage and update chat metadata
  const trackAgentUsage = (id: string, agentType?: string): void => {
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
  };

  // NEW: Enhanced saveChatMessage with agent tracking
  const saveChatMessage = (id: string, message: HybridMessage): void => {
    try {
      const existingMessages = getChatMessages(id);
      const updatedMessages = [...existingMessages, message];
      setStorageItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${id}`, updatedMessages);
      
      // Track agent usage if it's a bot message with agent info
      if (message.sender === 'bot' && message.agent) {
        trackAgentUsage(id, message.agent);
      }
      
      // Update chat metadata with enhanced tracking
      updateChatMetadata(id, {
        lastMessageAt: message.timestamp,
        messageCount: updatedMessages.length,
        localMessageCount: updatedMessages.filter(m => !m.synced).length,
        isSynced: message.synced, // Chat is only synced if the latest message is synced
      });
      
      console.log(`[ChatManager] Saved message to hybrid storage for chat ${id}`);
      
      // Auto-sync new messages to remote storage in background
      if (!message.synced) {
        setTimeout(() => {
          saveMessagesToRemoteImpl(id, [message]).catch(error => {
            console.warn(`[ChatManager] Background sync failed for chat ${id}:`, error);
          });
        }, 1000); // Delay to avoid blocking UI
      }
    } catch (error) {
      console.error(`[ChatManager] Failed to save message for chat ${id}:`, error);
    }
  };

  // NEW: Mark chat as synced/unsynced
  const markChatSynced = (id: string, synced: boolean): void => {
    updateChatMetadata(id, {
      isSynced: synced,
      lastSyncAt: synced ? new Date() : undefined,
    });
  };

  // NEW: Sync chat with backend
  const syncChatWithBackend = async (id: string): Promise<void> => {
    if (syncInProgress.has(id)) {
      console.log(`[ChatManager] Sync already in progress for chat ${id}`);
      return;
    }

    setSyncInProgress(prev => new Set(prev).add(id));
    
    try {
      console.log(`[ChatManager] Starting sync for chat ${id}`);
      
      // Get chat history from backend
      const backendHistory = await getChatHistory(id);
      const backendMessages = backendHistory.messages.map(convertToHybridMessage);
      
      // Get local messages
      const localMessages = getChatMessages(id);
      
      // Merge messages (backend takes precedence for conflicts)
      const mergedMessages: HybridMessage[] = [];
      const messageMap = new Map<number, HybridMessage>();
      
      // Add backend messages first (they are authoritative)
      backendMessages.forEach(msg => messageMap.set(msg.id, msg));
      
      // Add local messages that aren't in backend yet
      localMessages.forEach(msg => {
        if (!messageMap.has(msg.id)) {
          messageMap.set(msg.id, { ...msg, synced: false });
        }
      });
      
      // Sort messages by timestamp
      const sortedMessages = Array.from(messageMap.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Save merged messages to local storage
      setStorageItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${id}`, sortedMessages);
      
      // Update chat metadata
      updateChatMetadata(id, {
        messageCount: sortedMessages.length,
        isSynced: true,
        lastSyncAt: new Date(),
        lastMessageAt: sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1].timestamp : new Date(),
      });
      
      console.log(`[ChatManager] Successfully synced chat ${id} with ${sortedMessages.length} messages`);
      
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
  };

  // Create a new chat
  const createChat = (title?: string): string => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: title || 'New Chat',
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
      isLoading: false,        // NEW: default to not loading
      hasNewMessages: false,   // NEW: default to no new messages
      isSynced: false,         // NEW: default to not synced
      lastSyncAt: undefined,   // NEW: no sync yet
      isLoadingMessages: false,    // NEW
      remoteMessageCount: 0,       // NEW
      localMessageCount: 0,        // NEW
      lastRemoteSync: undefined,   // NEW
      agentType: undefined,        // NEW: no agent assigned initially
      agentHistory: [],            // NEW: empty agent history
    };

    setChats(prevChats => [...prevChats, newChat]);
    setActiveChatId(newChat.id);
    
    // Initialize empty message array for new chat
    setStorageItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${newChat.id}`, []);
    
    console.log('[ChatManager] Created new chat:', newChat.id);
    return newChat.id;
  };

  // Delete a chat
  const deleteChat = (id: string): void => {
    // Clean up chat messages from localStorage
    try {
      localStorage.removeItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${id}`);
      console.log(`[ChatManager] Cleaned up messages for deleted chat: ${id}`);
    } catch (error) {
      console.warn(`[ChatManager] Failed to cleanup messages for chat ${id}:`, error);
    }
    
    setChats(prevChats => {
      const updatedChats = prevChats.filter(chat => chat.id !== id);
      
      // If we deleted the active chat, switch to another one
      if (id === activeChatId && updatedChats.length > 0) {
        setActiveChatId(updatedChats[0].id);
      } else if (updatedChats.length === 0) {
        // If no chats left, create a new default one
        const defaultChat = createDefaultChat();
        setActiveChatId(defaultChat.id);
        return [defaultChat];
      }
      
      console.log('[ChatManager] Deleted chat:', id);
      return updatedChats;
    });
  };

  // Rename a chat
  const renameChat = (id: string, title: string): void => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === id 
          ? { ...chat, title: title.trim() || 'Untitled Chat' }
          : chat
      )
    );
    
    console.log('[ChatManager] Renamed chat:', id, 'to:', title);
  };

  // Update chat metadata (lastMessageAt, messageCount, isLoading, hasNewMessages, isSynced, lastSyncAt)
  const updateChatMetadata = (id: string, updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages' | 'isSynced' | 'lastSyncAt' | 'isLoadingMessages' | 'remoteMessageCount' | 'localMessageCount' | 'lastRemoteSync' | 'agentType' | 'agentHistory'>>): void => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === id 
          ? { ...chat, ...updates }
          : chat
      )
    );
  };

  // NEW: Set loading state for a specific chat
  const setChatLoading = (id: string, isLoading: boolean): void => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === id ? { ...chat, isLoading } : chat
      )
    );
  };

  // NEW: Mark chat as having new messages
  const markChatNewMessage = (id: string, hasNew: boolean): void => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === id ? { ...chat, hasNewMessages: hasNew } : chat
      )
    );
  };

  // NEW: Clear new message indicator for a specific chat
  const clearNewMessages = (id: string): void => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === id ? { ...chat, hasNewMessages: false } : chat
      )
    );
  };

  // Switch to a different chat
  const switchChat = (id: string): void => {
    const chatExists = chats.find(chat => chat.id === id);
    if (chatExists) {
      setActiveChatId(id);
      clearNewMessages(id); // NEW: clear new messages when switching
      
      // NEW: Attempt to sync chat with backend when switching (background operation)
      if (!chatExists.isSynced || (chatExists.lastSyncAt && Date.now() - chatExists.lastSyncAt.getTime() > 5 * 60 * 1000)) {
        // Sync if not synced or last sync was more than 5 minutes ago
        syncChatWithBackend(id).catch(error => {
          console.warn(`[ChatManager] Background sync failed for chat ${id}:`, error);
        });
      }
      
      console.log('[ChatManager] Switched to chat:', id);
    } else {
      console.warn('[ChatManager] Attempted to switch to non-existent chat:', id);
    }
  };

  // NEW: Enhanced hybrid storage functions
  const loadMessagesFromRemoteImpl = async (id: string): Promise<HybridMessage[]> => {
    try {
      updateChatMetadata(id, { isLoadingMessages: true });
      
      // Use getChatHistory instead of loadMessagesFromRemote since the backend has /api/chats/:sessionId/history
      const historyResponse = await getChatHistory(id);
      
      // Convert ChatMessage[] to HybridMessage[]
      const hybridMessages: HybridMessage[] = historyResponse.messages.map((entry: any) => ({
        id: entry.id || parseInt(`${Date.now()}${Math.random()}`),
        content: entry.content,
        sender: entry.type === 'user' ? 'user' : 'bot',
        timestamp: new Date(entry.timestamp),
        agent: entry.agent,
        sessionId: id,
        synced: true  // Messages from remote are considered synced
      }));

      updateChatMetadata(id, { 
        isLoadingMessages: false, 
        isSynced: true,
        lastRemoteSync: new Date()
      });
      
      return hybridMessages;
    } catch (error) {
      console.error('Failed to load messages from remote:', error);
      updateChatMetadata(id, { isLoadingMessages: false });
      return [];
    }
  };

  const saveMessagesToRemoteImpl = async (id: string, messages: HybridMessage[]): Promise<boolean> => {
    try {
      const apiMessages = messages.map(convertToApiMessage);
      const response = await saveMessagesToRemote(id, apiMessages);
      
      if (response.success) {
        // Mark messages as synced
        const syncedMessages = messages.map(msg => ({ ...msg, synced: true }));
        setStorageItem(`${STORAGE_KEYS.MESSAGES_PREFIX}${id}`, syncedMessages);
        
        updateChatMetadata(id, {
          remoteMessageCount: response.messagesSaved,
          lastRemoteSync: new Date(),
        });
        
        console.log(`[ChatManager] Saved ${response.messagesSaved} messages to remote for chat ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`[ChatManager] Failed to save messages to remote for chat ${id}:`, error);
      return false;
    }
  };

  const getMessagesProgressively = async (id: string): Promise<{ messages: HybridMessage[]; isLoading: boolean }> => {
    // First, return local messages immediately for fast UI response
    const localMessages = getChatMessages(id);
    const chat = chats.find(c => c.id === id);
    
    if (!chat) {
      return { messages: localMessages, isLoading: false };
    }

    // Check if we need to load from remote
    const shouldLoadRemote = !chat.isSynced || 
      !chat.lastRemoteSync || 
      (Date.now() - chat.lastRemoteSync.getTime() > 5 * 60 * 1000); // 5 minutes

    if (shouldLoadRemote && !chat.isLoadingMessages) {
      // Start loading from remote in background
      loadMessagesFromRemoteImpl(id).then(remoteMessages => {
        if (remoteMessages.length > 0) {
          // Merge with local messages
          const mergedMessages = mergeMessages(localMessages, remoteMessages);
          setChats(prevChats => 
            prevChats.map(c => 
              c.id === id 
                ? { ...c, messages: mergedMessages }
                : c
            )
          );
        }
      }).catch(error => {
        console.error('Background remote loading failed:', error);
      });

      return { messages: localMessages, isLoading: true };
    }

    return { messages: localMessages, isLoading: false };
  };

  // Helper function to merge local and remote messages
  const mergeMessages = (localMessages: HybridMessage[], remoteMessages: HybridMessage[]): HybridMessage[] => {
    const messageMap = new Map<number, HybridMessage>();
    
    // Add remote messages first (they are authoritative)
    remoteMessages.forEach(msg => messageMap.set(msg.id, msg));
    
    // Add local messages that aren't in remote yet
    localMessages.forEach(msg => {
      if (!messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });
    
    // Sort messages by timestamp
    return Array.from(messageMap.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const contextValue: ChatManagerContextType = {
    chats,
    activeChatId,
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
    saveChatMessage,
    markChatSynced,
    trackAgentUsage,
    loadMessagesFromRemote: loadMessagesFromRemoteImpl,
    saveMessagesToRemote: saveMessagesToRemoteImpl,
    getMessagesProgressively,
  };

  return (
    <ChatManagerContext.Provider value={contextValue}>
      {children}
    </ChatManagerContext.Provider>
  );
};

// Custom hook to use ChatManager context
export const useChatManager = (): ChatManagerContextType => {
  const context = useContext(ChatManagerContext);
  
  if (context === undefined) {
    throw new Error('useChatManager must be used within a ChatManagerProvider');
  }
  
  return context;
};

export default useChatManager; 