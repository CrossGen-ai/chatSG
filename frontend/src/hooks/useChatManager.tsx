import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Chat interface definition
export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  isLoading: boolean;     // NEW: tracks if chat has pending requests
  hasNewMessages: boolean; // NEW: tracks if chat has unread messages
}

// ChatManager context interface
interface ChatManagerContextType {
  chats: Chat[];
  activeChatId: string;
  createChat: (title?: string) => string;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  switchChat: (id: string) => void;
  updateChatMetadata: (id: string, updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages'>>) => void;
  setChatLoading: (id: string, isLoading: boolean) => void;     // NEW: set loading state
  markChatNewMessage: (id: string, hasNew: boolean) => void;    // NEW: mark new messages
  clearNewMessages: (id: string) => void;                       // NEW: clear new message indicator
}

// Create context
const ChatManagerContext = createContext<ChatManagerContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  CHATS: 'chatsg-chats',
  ACTIVE_CHAT: 'chatsg-active-chat',
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

// Helper function to create a default chat
const createDefaultChat = (): Chat => ({
  id: crypto.randomUUID(),
  title: 'New Chat',
  createdAt: new Date(),
  lastMessageAt: new Date(),
  messageCount: 0,
  isLoading: false,        // NEW: default to not loading
  hasNewMessages: false,   // NEW: default to no new messages
});

// Helper function to deserialize dates from localStorage
const deserializeChat = (chat: any): Chat => ({
  ...chat,
  createdAt: new Date(chat.createdAt),
  lastMessageAt: new Date(chat.lastMessageAt),
  isLoading: chat.isLoading || false,           // NEW: default to false if missing
  hasNewMessages: chat.hasNewMessages || false, // NEW: default to false if missing
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
    };

    setChats(prevChats => [...prevChats, newChat]);
    setActiveChatId(newChat.id);
    
    console.log('[ChatManager] Created new chat:', newChat.id);
    return newChat.id;
  };

  // Delete a chat
  const deleteChat = (id: string): void => {
    // Clean up chat messages from localStorage
    try {
      localStorage.removeItem(`chat-messages-${id}`);
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

  // Update chat metadata (lastMessageAt, messageCount, isLoading, hasNewMessages)
  const updateChatMetadata = (id: string, updates: Partial<Pick<Chat, 'lastMessageAt' | 'messageCount' | 'isLoading' | 'hasNewMessages'>>): void => {
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
      console.log('[ChatManager] Switched to chat:', id);
    } else {
      console.warn('[ChatManager] Attempted to switch to non-existent chat:', id);
    }
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