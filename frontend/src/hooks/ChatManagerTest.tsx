import React from 'react';
import { ChatManagerProvider, useChatManager } from './useChatManager';

// Test component to verify ChatManager functionality
const ChatManagerTestComponent: React.FC = () => {
  const { 
    chats, 
    activeChatId, 
    createChat, 
    deleteChat, 
    renameChat, 
    switchChat, 
    updateChatMetadata 
  } = useChatManager();

  const handleCreateChat = () => {
    const chatId = createChat(`Chat ${chats.length + 1}`);
    console.log('Created chat:', chatId);
  };

  const handleDeleteChat = (id: string) => {
    deleteChat(id);
    console.log('Deleted chat:', id);
  };

  const handleRenameChat = (id: string) => {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
      renameChat(id, newTitle);
      console.log('Renamed chat:', id, 'to:', newTitle);
    }
  };

  const handleSwitchChat = (id: string) => {
    switchChat(id);
    console.log('Switched to chat:', id);
  };

  const handleUpdateMetadata = (id: string) => {
    updateChatMetadata(id, {
      lastMessageAt: new Date(),
      messageCount: Math.floor(Math.random() * 10) + 1,
    });
    console.log('Updated metadata for chat:', id);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>ChatManager Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Active Chat: {activeChatId}</h3>
        <button onClick={handleCreateChat}>Create New Chat</button>
      </div>

      <div>
        <h3>Chats ({chats.length}):</h3>
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '5px 0',
              backgroundColor: chat.id === activeChatId ? '#e6f3ff' : '#f9f9f9'
            }}
          >
            <div><strong>ID:</strong> {chat.id}</div>
            <div><strong>Title:</strong> {chat.title}</div>
            <div><strong>Messages:</strong> {chat.messageCount}</div>
            <div><strong>Created:</strong> {chat.createdAt.toLocaleString()}</div>
            <div><strong>Last Message:</strong> {chat.lastMessageAt.toLocaleString()}</div>
            
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => handleSwitchChat(chat.id)}>Switch</button>
              <button onClick={() => handleRenameChat(chat.id)} style={{ marginLeft: '5px' }}>Rename</button>
              <button onClick={() => handleUpdateMetadata(chat.id)} style={{ marginLeft: '5px' }}>Update Metadata</button>
              {chats.length > 1 && (
                <button onClick={() => handleDeleteChat(chat.id)} style={{ marginLeft: '5px', color: 'red' }}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Check browser console for operation logs. Check localStorage for persistence.
      </div>
    </div>
  );
};

// Test wrapper component
export const ChatManagerTest: React.FC = () => {
  return (
    <ChatManagerProvider>
      <ChatManagerTestComponent />
    </ChatManagerProvider>
  );
};

export default ChatManagerTest; 