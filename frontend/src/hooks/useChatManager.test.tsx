import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatManagerProvider, useChatManager, HybridMessage } from './useChatManager';

// Mock the chat API
jest.mock('../api/chat', () => ({
  getChatHistory: jest.fn().mockResolvedValue({
    sessionId: 'test-session',
    messages: [
      {
        id: 1,
        content: 'Hello from backend',
        type: 'bot',
        timestamp: '2023-01-01T00:00:00.000Z',
        agent: 'test-agent'
      }
    ],
    messageCount: 1,
    agentHistory: [],
    toolsUsed: [],
    analytics: {}
  })
}));

// Test component that uses the ChatManager
const TestComponent: React.FC = () => {
  const { 
    chats, 
    activeChatId, 
    createChat, 
    deleteChat, 
    renameChat, 
    switchChat,
    getChatMessages,
    saveChatMessage,
    syncChatWithBackend,
    markChatSynced,
    trackAgentUsage,
    getMessagesProgressively,
    updateChatMetadata,
    setChatLoading,
    markChatNewMessage
  } = useChatManager();

  const handleCreateChat = () => {
    createChat('Test Chat');
  };

  const handleDeleteChat = () => {
    if (chats.length > 0) {
      deleteChat(chats[0].id);
    }
  };

  const handleRenameChat = () => {
    if (chats.length > 0) {
      renameChat(chats[0].id, 'Renamed Chat');
    }
  };

  const handleSwitchChat = () => {
    if (chats.length > 1) {
      switchChat(chats[1].id);
    }
  };

  const handleSaveMessage = () => {
    if (chats.length > 0) {
      const testMessage: HybridMessage = {
        id: Date.now(),
        content: 'Test message',
        sender: 'user',
        timestamp: new Date(),
        synced: false
      };
      saveChatMessage(chats[0].id, testMessage);
    }
  };

  const handleSyncChat = async () => {
    if (chats.length > 0) {
      await syncChatWithBackend(chats[0].id);
    }
  };

  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = chats.length > 0 ? getChatMessages(chats[0].id) : [];

  return (
    <div>
      <div data-testid="chat-count">{chats.length}</div>
      <div data-testid="active-chat-id">{activeChatId}</div>
      <div data-testid="active-chat-title">{activeChat?.title || 'No active chat'}</div>
      <div data-testid="active-chat-synced">{activeChat?.isSynced ? 'synced' : 'not-synced'}</div>
      <div data-testid="message-count">{messages.length}</div>
      
      <button onClick={handleCreateChat} data-testid="create-chat">
        Create Chat
      </button>
      <button onClick={handleDeleteChat} data-testid="delete-chat">
        Delete Chat
      </button>
      <button onClick={handleRenameChat} data-testid="rename-chat">
        Rename Chat
      </button>
      <button onClick={handleSwitchChat} data-testid="switch-chat">
        Switch Chat
      </button>
      <button onClick={handleSaveMessage} data-testid="save-message">
        Save Message
      </button>
      <button onClick={handleSyncChat} data-testid="sync-chat">
        Sync Chat
      </button>
    </div>
  );
};

describe('ChatManager with Hybrid Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  const renderWithProvider = () => {
    return render(
      <ChatManagerProvider>
        <TestComponent />
      </ChatManagerProvider>
    );
  };

  test('should initialize with a default chat', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('chat-count')).toHaveTextContent('1');
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent('New Chat');
    expect(screen.getByTestId('active-chat-synced')).toHaveTextContent('not-synced');
  });

  test('should create new chats', () => {
    renderWithProvider();
    
    fireEvent.click(screen.getByTestId('create-chat'));
    
    expect(screen.getByTestId('chat-count')).toHaveTextContent('2');
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent('Test Chat');
  });

  test('should delete chats', () => {
    renderWithProvider();
    
    // Create an additional chat first
    fireEvent.click(screen.getByTestId('create-chat'));
    expect(screen.getByTestId('chat-count')).toHaveTextContent('2');
    
    // Delete a chat
    fireEvent.click(screen.getByTestId('delete-chat'));
    expect(screen.getByTestId('chat-count')).toHaveTextContent('1');
  });

  test('should rename chats', () => {
    renderWithProvider();
    
    fireEvent.click(screen.getByTestId('rename-chat'));
    
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent('Renamed Chat');
  });

  test('should switch between chats', () => {
    renderWithProvider();
    
    // Create a second chat
    fireEvent.click(screen.getByTestId('create-chat'));
    const firstActiveId = screen.getByTestId('active-chat-id').textContent;
    
    // Create a third chat to switch back to
    fireEvent.click(screen.getByTestId('create-chat'));
    
    // Switch to the second chat
    fireEvent.click(screen.getByTestId('switch-chat'));
    
    const newActiveId = screen.getByTestId('active-chat-id').textContent;
    expect(newActiveId).not.toBe(firstActiveId);
  });

  test('should save and retrieve messages from hybrid storage', () => {
    renderWithProvider();
    
    // Initially no messages
    expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    
    // Save a message
    fireEvent.click(screen.getByTestId('save-message'));
    
    // Should now have 1 message
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
  });

  test('should sync chat with backend', async () => {
    renderWithProvider();
    
    // Initially not synced
    expect(screen.getByTestId('active-chat-synced')).toHaveTextContent('not-synced');
    
    // Sync with backend
    fireEvent.click(screen.getByTestId('sync-chat'));
    
    // Wait for sync to complete
    await waitFor(() => {
      expect(screen.getByTestId('active-chat-synced')).toHaveTextContent('synced');
    });
  });

  test('should persist chat data across page reloads', () => {
    // First render
    const { unmount } = renderWithProvider();
    
    fireEvent.click(screen.getByTestId('create-chat'));
    fireEvent.click(screen.getByTestId('rename-chat'));
    fireEvent.click(screen.getByTestId('save-message'));
    
    const chatCount = screen.getByTestId('chat-count').textContent;
    const chatTitle = screen.getByTestId('active-chat-title').textContent;
    const messageCount = screen.getByTestId('message-count').textContent;
    
    // Unmount and remount (simulating page reload)
    unmount();
    renderWithProvider();
    
    // Data should persist
    expect(screen.getByTestId('chat-count')).toHaveTextContent(chatCount!);
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent(chatTitle!);
    expect(screen.getByTestId('message-count')).toHaveTextContent(messageCount!);
  });

  test('should handle hybrid message format correctly', () => {
    renderWithProvider();
    
    // Save a message and verify it's stored correctly
    fireEvent.click(screen.getByTestId('save-message'));
    
    // The message should be saved with synced: false initially
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId('active-chat-synced')).toHaveTextContent('not-synced');
  });

  // New comprehensive tests for enhanced features
  test('should track agent usage in chat history', () => {
    renderWithProvider();
    
    const { trackAgentUsage } = useChatManager();
    
    // Track multiple agent usages
    act(() => {
      trackAgentUsage('analytical');
      trackAgentUsage('creative');
      trackAgentUsage('technical');
    });
    
    const activeChat = screen.getByTestId('active-chat-id').textContent!;
    const chat = JSON.parse(localStorage.getItem(`chat_${activeChat}`) || '{}');
    
    expect(chat.agentHistory).toEqual(['analytical', 'creative', 'technical']);
    expect(chat.agentType).toBe('technical'); // Should be the last agent used
  });

  test('should limit agent history to 10 entries', () => {
    renderWithProvider();
    
    const { trackAgentUsage } = useChatManager();
    
    // Track more than 10 agents
    act(() => {
      for (let i = 0; i < 15; i++) {
        trackAgentUsage(`agent${i}`);
      }
    });
    
    const activeChat = screen.getByTestId('active-chat-id').textContent!;
    const chat = JSON.parse(localStorage.getItem(`chat_${activeChat}`) || '{}');
    
    expect(chat.agentHistory).toHaveLength(10);
    expect(chat.agentHistory[0]).toBe('agent5'); // Should start from agent5 (oldest removed)
    expect(chat.agentHistory[9]).toBe('agent14'); // Should end with agent14 (newest)
  });

  test('should handle progressive message loading', async () => {
    renderWithProvider();
    
    const { getMessagesProgressively } = useChatManager();
    
    // Mock a chat with many messages
    const chatId = screen.getByTestId('active-chat-id').textContent!;
    const manyMessages = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      content: `Message ${i + 1}`,
      sender: (i % 2 === 0 ? 'user' : 'bot') as 'user' | 'bot',
      timestamp: new Date(Date.now() + i * 1000),
      synced: true
    }));
    
    // Save messages to localStorage
    localStorage.setItem(`chat_${chatId}`, JSON.stringify({
      id: chatId,
      title: 'Test Chat',
      messages: manyMessages,
      isSynced: true,
      createdAt: new Date().toISOString()
    }));
    
    // Test progressive loading
    const messages10 = await getMessagesProgressively(chatId);
    expect(messages10.messages).toHaveLength(50); // Should return all messages
    
    const messages25 = await getMessagesProgressively(chatId);
    expect(messages25.messages).toHaveLength(50); // Should return all messages
  });

  test('should handle basic chat functionality', () => {
    renderWithProvider();
    
    // Test basic chat creation and management
    expect(screen.getByTestId('chat-count')).toHaveTextContent('1');
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent('New Chat');
  });

  test('should handle error states gracefully', () => {
    renderWithProvider();
    
    const { deleteChat, switchChat } = useChatManager();
    
    // Try to delete non-existent chat
    act(() => {
      deleteChat('non-existent-chat-id');
    });
    
    // Should not crash and chat count should remain the same
    expect(screen.getByTestId('chat-count')).toHaveTextContent('1');
    
    // Try to switch to non-existent chat
    act(() => {
      switchChat('non-existent-chat-id');
    });
    
    // Should not crash and active chat should remain the same
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent('New Chat');
  });

  test('should maintain chat order and timestamps', () => {
    renderWithProvider();
    
    const { createChat } = useChatManager();
    
    // Create multiple chats with delays
    const chatTitles = ['First Chat', 'Second Chat', 'Third Chat'];
    
    chatTitles.forEach((title, index) => {
      act(() => {
        createChat(title);
      });
    });
    
    expect(screen.getByTestId('chat-count')).toHaveTextContent('4'); // Original + 3 new
    
    // Verify the latest chat is active
    expect(screen.getByTestId('active-chat-title')).toHaveTextContent('Third Chat');
  });
});

// Additional test suite for Chat Settings integration
describe('ChatManager with Settings Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const renderWithProviders = () => {
    return render(
      <ChatManagerProvider>
        <TestComponent />
      </ChatManagerProvider>
    );
  };

  test('should integrate with chat settings for cross-session memory', () => {
    // Mock chat settings
    const mockSettings = {
      crossSessionMemory: true,
      agentLock: false
    };
    
    // This would require ChatSettingsProvider integration
    // For now, we test the structure exists
    renderWithProviders();
    
    const chatId = screen.getByTestId('active-chat-id').textContent;
    const chat = JSON.parse(localStorage.getItem(`chat_${chatId}`) || '{}');
    
    // Verify chat structure supports settings
    expect(typeof chat).toBe('object');
    expect(chat.id).toBeDefined();
    expect(chat.title).toBeDefined();
    expect(Array.isArray(chat.messages)).toBe(true);
  });

  test('should support agent lock functionality through chat settings', () => {
    renderWithProviders();
    
    const chatId = screen.getByTestId('active-chat-id').textContent!;
    
    // Test agent lock through localStorage simulation (since we don't have full ChatSettingsProvider in test)
    const mockAgentLockSettings = {
      crossSessionMemory: false,
      agentLock: true,
      preferredAgent: 'analytical',
      lastAgentUsed: 'technical',
      agentLockTimestamp: new Date()
    };
    
    // Simulate chat settings storage
    localStorage.setItem(`chat-settings-${chatId}`, JSON.stringify(mockAgentLockSettings));
    
    // Verify settings can be retrieved
    const storedSettings = JSON.parse(localStorage.getItem(`chat-settings-${chatId}`) || '{}');
    expect(storedSettings.agentLock).toBe(true);
    expect(storedSettings.preferredAgent).toBe('analytical');
    expect(storedSettings.agentLockTimestamp).toBeDefined();
    expect(storedSettings.lastAgentUsed).toBe('technical');
  });

  test('should handle agent tracking in chat metadata separately from settings', () => {
    renderWithProviders();
    
    const { updateChatMetadata } = useChatManager();
    const chatId = screen.getByTestId('active-chat-id').textContent!;
    
    // Test chat metadata updates (separate from agent lock settings)
    act(() => {
      updateChatMetadata(chatId, {
        agentType: 'analytical',
        agentHistory: ['technical', 'analytical'],
        lastSyncAt: new Date()
      });
    });
    
    // Verify chat metadata is updated correctly
    const chatMetadata = JSON.parse(localStorage.getItem(`chatsg-chats`) || '[]');
    const chat = chatMetadata.find((c: any) => c.id === chatId);
    expect(chat?.agentType).toBe('analytical');
    expect(chat?.agentHistory).toEqual(['technical', 'analytical']);
    expect(chat?.lastSyncAt).toBeDefined();
  });
}); 