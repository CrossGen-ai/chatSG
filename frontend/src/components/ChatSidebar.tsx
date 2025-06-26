import React, { useState, useRef, useEffect } from 'react';
import { useChatManager } from '../hooks/useChatManager';
import { ChatListSkeleton } from './SkeletonLoader';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const { 
    chats, 
    activeChatId, 
    createChat, 
    deleteChat, 
    renameChat, 
    switchChat,
    isLoadingChats,
    isCreatingChat,
    isDeletingChat
  } = useChatManager();

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [focusedChatId, setFocusedChatId] = useState<string | null>(null);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus edit input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Set initial focus to active chat when sidebar opens
  useEffect(() => {
    if (isOpen && activeChatId && !focusedChatId) {
      setFocusedChatId(activeChatId);
    }
  }, [isOpen, activeChatId, focusedChatId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuChatId) {
        const target = e.target as Element;
        // Check if click is outside context menu and not on the ellipsis button
        if (!target.closest('[data-context-menu]') && !target.closest('[data-ellipsis-button]')) {
          setContextMenuChatId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenuChatId]);

  // Keyboard shortcuts for chat management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape to exit selection mode
      if (e.key === 'Escape' && isSelectionMode) {
        e.preventDefault();
        toggleSelectionMode();
        return;
      }
      
      // Only handle other shortcuts when sidebar is focused and a chat is focused
      if (!focusedChatId || editingChatId || isSelectionMode) return;
      
      if (e.key === 'Delete') {
        e.preventDefault();
        setShowDeleteConfirm(focusedChatId);
      } else if (e.key === 'F2') {
        e.preventDefault();
        const chat = chats.find(c => c.id === focusedChatId);
        if (chat) {
          handleRenameStart(focusedChatId, chat.title);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedChatId, chats, editingChatId, isSelectionMode]);

  // Show success message helper
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedChatIds(new Set());
    setFocusedChatId(null);
  };

  // Handle individual chat selection
  const handleChatSelection = (chatId: string, isSelected: boolean) => {
    setSelectedChatIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(chatId);
      } else {
        newSet.delete(chatId);
      }
      return newSet;
    });
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (selectedChatIds.size === chats.length) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(chats.map(chat => chat.id)));
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    const chatCount = selectedChatIds.size;
    try {
      // Delete chats one by one
      for (const chatId of selectedChatIds) {
        await deleteChat(chatId);
      }
      
      showSuccessMessage(`${chatCount} chats deleted successfully`);
      setSelectedChatIds(new Set());
      setIsSelectionMode(false);
      setShowBatchDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete some chats:', error);
      showSuccessMessage('Some chats could not be deleted. Please try again.');
    }
  };

  // Handle new chat creation
  const handleNewChat = async () => {
    try {
      const newChatId = await createChat();
      switchChat(newChatId);
      onClose(); // Close sidebar on mobile after creating chat
    } catch (error) {
      console.error('Failed to create chat:', error);
      // Show error message
      setSuccessMessage('Failed to create chat. Please try again.');
    }
  };

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    switchChat(chatId);
    onClose(); // Close sidebar on mobile after selecting chat
  };

  // Handle rename start
  const handleRenameStart = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
    setContextMenuChatId(null);
  };

  // Handle rename save
  const handleRenameSave = async () => {
    if (editingChatId && editingTitle.trim()) {
      const trimmedTitle = editingTitle.trim();
      
      // Check for duplicate titles (case-insensitive)
      const isDuplicate = chats.some(chat => 
        chat.id !== editingChatId && 
        chat.title.toLowerCase() === trimmedTitle.toLowerCase()
      );
      
      if (isDuplicate) {
        alert('A chat with this name already exists. Please choose a different name.');
        return; // Don't close edit mode, let user try again
      }
      
      try {
        await renameChat(editingChatId, trimmedTitle);
        showSuccessMessage(`Chat renamed to "${trimmedTitle}"`);
      } catch (error) {
        console.error('Failed to rename chat:', error);
        showSuccessMessage('Failed to rename chat. Please try again.');
      }
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Handle rename cancel
  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      showSuccessMessage('Chat deleted successfully');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      showSuccessMessage('Failed to delete chat. Please try again.');
    }
    setShowDeleteConfirm(null);
    setContextMenuChatId(null);
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full backdrop-blur-xl bg-white/10 dark:bg-black/10 border-r border-white/20 dark:border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/20 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold theme-text-primary">
                {isSelectionMode ? `${selectedChatIds.size} Selected` : 'Chats'}
              </h2>
              <div className="flex items-center space-x-2">
                {/* Selection Mode Toggle */}
                {chats.length > 0 && (
                  <button
                    onClick={toggleSelectionMode}
                    className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                    aria-label={isSelectionMode ? "Exit selection mode" : "Enter selection mode"}
                    title={isSelectionMode ? "Exit selection mode (ESC)" : "Select multiple chats"}
                  >
                    <svg className="w-5 h-5 theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isSelectionMode ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg className="w-5 h-5 theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Selection Mode Controls */}
            {isSelectionMode && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm theme-text-secondary hover:theme-text-primary transition-colors"
                  >
                    {selectedChatIds.size === chats.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedChatIds.size > 0 && (
                    <button
                      onClick={() => setShowBatchDeleteConfirm(true)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete {selectedChatIds.size}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* New Chat Button */}
            {!isSelectionMode && (
              <button
                onClick={handleNewChat}
                disabled={isCreatingChat}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl backdrop-blur-md bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-200 shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Create new chat"
              >
                {isCreatingChat ? (
                  <>
                    <svg className="w-5 h-5 animate-spin theme-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="font-medium theme-text-primary">Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 theme-text-primary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium theme-text-primary">New Chat</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {isLoadingChats ? (
              <div className="p-2">
                <ChatListSkeleton count={5} />
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-gray-400 dark:text-gray-500 text-sm">
                  No chats yet. Create your first chat!
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`relative group rounded-lg transition-all duration-200 ${
                      chat.id === activeChatId
                        ? 'bg-white/30 dark:bg-white/20 shadow-md'
                        : 'hover:bg-white/20 dark:hover:bg-white/10'
                    } ${
                      chat.id === focusedChatId
                        ? 'ring-2 ring-blue-500/50 ring-offset-2 ring-offset-transparent'
                        : ''
                    }`}
                  >
                    {editingChatId === chat.id ? (
                      // Edit mode
                      <div className="p-3">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave();
                            if (e.key === 'Escape') handleRenameCancel();
                          }}
                          onBlur={handleRenameSave}
                          className="w-full px-2 py-1 text-sm bg-white/50 dark:bg-black/50 border border-white/30 dark:border-white/20 rounded theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          maxLength={50}
                        />
                      </div>
                    ) : (
                      // Normal mode
                      <div className="flex items-center w-full">
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                          <div className="flex-shrink-0 p-3 pr-2">
                            <input
                              type="checkbox"
                              checked={selectedChatIds.has(chat.id)}
                              onChange={(e) => handleChatSelection(chat.id, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 bg-white/50 dark:bg-black/50 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
                            />
                          </div>
                        )}
                        
                        <button
                          onClick={() => isSelectionMode ? handleChatSelection(chat.id, !selectedChatIds.has(chat.id)) : handleChatSelect(chat.id)}
                          onContextMenu={(e) => {
                            if (!isSelectionMode) {
                              e.preventDefault();
                              setContextMenuChatId(chat.id);
                            }
                          }}
                          onFocus={() => !isSelectionMode && setFocusedChatId(chat.id)}
                          onBlur={() => !isSelectionMode && setFocusedChatId(null)}
                          className="flex-1 p-3 text-left focus:outline-none rounded-lg"
                          aria-label={isSelectionMode ? `${selectedChatIds.has(chat.id) ? 'Deselect' : 'Select'} ${chat.title}` : `Switch to ${chat.title}. Press F2 to rename, Delete to delete.`}
                        >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium theme-text-primary truncate text-sm">
                                {chat.title}
                              </div>
                              
                              {/* Loading indicator for chats with pending requests */}
                              {chat.isLoading && (
                                <div className="flex-shrink-0">
                                  <svg className="w-3 h-3 animate-spin theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </div>
                              )}
                              
                              {/* Deleting indicator */}
                              {isDeletingChat === chat.id && (
                                <div className="flex-shrink-0">
                                  <svg className="w-3 h-3 animate-spin text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </div>
                              )}
                              
                              {/* Blue dot for chats with new messages */}
                              {chat.hasNewMessages && !chat.isLoading && isDeletingChat !== chat.id && (
                                <div className="flex-shrink-0">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full border border-white dark:border-gray-900"></div>
                                </div>
                              )}
                              
                              {/* Sync status indicator */}
                              {!chat.isSynced && isDeletingChat !== chat.id && (
                                <div className="flex-shrink-0" title="Not synced with server">
                                  <svg className="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs theme-text-secondary">
                                {formatTimestamp(new Date(chat.lastMessageAt))}
                              </span>
                              {chat.messageCount > 0 && (
                                <span className="text-xs theme-text-secondary">
                                  • {chat.messageCount} messages
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* More options button */}
                          {!isSelectionMode && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuChatId(contextMenuChatId === chat.id ? null : chat.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/20 dark:hover:bg-white/10 transition-all cursor-pointer"
                              role="button"
                              tabIndex={0}
                              data-ellipsis-button
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setContextMenuChatId(contextMenuChatId === chat.id ? null : chat.id);
                                }
                              }}
                              aria-label="Chat options"
                            >
                              <svg className="w-4 h-4 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        </button>
                      </div>
                    )}

                    {/* Context Menu */}
                    {contextMenuChatId === chat.id && !isSelectionMode && (
                      <div className="absolute right-2 top-12 z-[9999] w-32 rounded-lg backdrop-blur-md bg-white/90 dark:bg-black/90 border border-white/30 dark:border-white/10 shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200" data-context-menu>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRenameStart(chat.id, chat.title);
                            setContextMenuChatId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm theme-text-primary hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                        >
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDeleteConfirm(chat.id);
                            setContextMenuChatId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Help */}
          {focusedChatId && (
            <div className="p-3 border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/10 dark:bg-black/10">
              <div className="text-xs theme-text-secondary text-center">
                <span className="inline-flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded">F2</kbd>
                  <span>rename</span>
                  <span className="mx-2">•</span>
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/20 rounded">Del</kbd>
                  <span>delete</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-xl backdrop-blur-xl bg-white/90 dark:bg-black/90 border border-white/30 dark:border-white/10 shadow-2xl p-6 animate-in slide-in-from-bottom-2 duration-200">
            <h3 className="text-lg font-semibold theme-text-primary mb-2">
              Delete Chat
            </h3>
            <p className="theme-text-secondary mb-6">
              Are you sure you want to delete this chat? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/30 dark:border-white/20 theme-text-primary hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBatchDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-xl backdrop-blur-xl bg-white/90 dark:bg-black/90 border border-white/30 dark:border-white/10 shadow-2xl p-6 animate-in slide-in-from-bottom-2 duration-200">
            <h3 className="text-lg font-semibold theme-text-primary mb-2">
              Delete Multiple Chats
            </h3>
            <p className="theme-text-secondary mb-6">
              Are you sure you want to delete {selectedChatIds.size} chat{selectedChatIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-white/30 dark:border-white/20 theme-text-primary hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete {selectedChatIds.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-60 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl backdrop-blur-xl bg-green-500/90 border border-green-400/30 shadow-2xl text-white">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-sm">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-2 p-1 rounded-full hover:bg-green-600/50 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}; 