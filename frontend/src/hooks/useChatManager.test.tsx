import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import { ChatManagerProvider, useChatManager, Chat } from './useChatManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

describe('ChatManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ChatManagerProvider>{children}</ChatManagerProvider>
  );

  it('should create a default chat on initialization', () => {
    const { result } = renderHook(() => useChatManager(), { wrapper });

    expect(result.current.chats).toHaveLength(1);
    expect(result.current.chats[0]).toMatchObject({
      id: 'test-uuid-123',
      title: 'New Chat',
      messageCount: 0,
    });
    expect(result.current.activeChatId).toBe('test-uuid-123');
  });

  it('should create a new chat', () => {
    const { result } = renderHook(() => useChatManager(), { wrapper });

    act(() => {
      const newChatId = result.current.createChat('Test Chat');
      expect(newChatId).toBe('test-uuid-123');
    });

    expect(result.current.chats).toHaveLength(2);
    expect(result.current.activeChatId).toBe('test-uuid-123');
  });

  it('should delete a chat', () => {
    const { result } = renderHook(() => useChatManager(), { wrapper });
    
    // Create a second chat first
    act(() => {
      result.current.createChat('Second Chat');
    });

    const firstChatId = result.current.chats[0].id;
    
    act(() => {
      result.current.deleteChat(firstChatId);
    });

    expect(result.current.chats).toHaveLength(1);
    expect(result.current.chats.find(chat => chat.id === firstChatId)).toBeUndefined();
  });

  it('should rename a chat', () => {
    const { result } = renderHook(() => useChatManager(), { wrapper });
    const chatId = result.current.chats[0].id;

    act(() => {
      result.current.renameChat(chatId, 'Renamed Chat');
    });

    expect(result.current.chats[0].title).toBe('Renamed Chat');
  });

  it('should switch to a different chat', () => {
    const { result } = renderHook(() => useChatManager(), { wrapper });
    
    // Create a second chat
    let secondChatId: string;
    act(() => {
      secondChatId = result.current.createChat('Second Chat');
    });

    const firstChatId = result.current.chats[0].id;

    act(() => {
      result.current.switchChat(firstChatId);
    });

    expect(result.current.activeChatId).toBe(firstChatId);
  });

  it('should update chat metadata', () => {
    const { result } = renderHook(() => useChatManager(), { wrapper });
    const chatId = result.current.chats[0].id;
    const newDate = new Date();

    act(() => {
      result.current.updateChatMetadata(chatId, {
        lastMessageAt: newDate,
        messageCount: 5,
      });
    });

    expect(result.current.chats[0].lastMessageAt).toBe(newDate);
    expect(result.current.chats[0].messageCount).toBe(5);
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useChatManager(), { wrapper });

    // Should still work with default chat
    expect(result.current.chats).toHaveLength(1);
    expect(result.current.activeChatId).toBeTruthy();
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useChatManager());
    }).toThrow('useChatManager must be used within a ChatManagerProvider');
  });
}); 