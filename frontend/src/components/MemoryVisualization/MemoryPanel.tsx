import React, { useState, useEffect } from 'react';
import { Brain, Pin, ChevronLeft, Database, Network, Table } from 'lucide-react';
import { MemoryTypeSelector } from './MemoryTypeSelector';
import { AdminUserSelector } from './AdminUserSelector';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  userRole: 'admin' | 'user';
  currentUserId: string;
}

export type MemoryType = 'short-term' | 'semantic' | 'long-term';

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  isOpen,
  onClose,
  isPinned,
  onTogglePin,
  userRole,
  currentUserId
}) => {
  const [activeMemoryType, setActiveMemoryType] = useState<MemoryType>('short-term');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  
  // Reset selected user when panel closes/opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(currentUserId);
    }
  }, [isOpen, currentUserId]);
  
  // Fetch memories when user or memory type changes
  useEffect(() => {
    console.log('[MemoryPanel] Current user ID:', currentUserId);
    console.log('[MemoryPanel] Selected user ID:', selectedUserId);
    if (isOpen && selectedUserId && selectedUserId !== '') {
      fetchMemories(activeMemoryType, selectedUserId);
    }
  }, [isOpen, activeMemoryType, selectedUserId, fetchMemories, currentUserId]);
  
  // Clear error when memory type changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [activeMemoryType, clearError]);
  
  const renderMemoryVisualization = () => {
    if (!currentUserId || currentUserId === '') {
      return (
        <div className="p-4 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded m-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Authentication Required</span>
          </div>
          <p className="mt-2 text-sm">Please log in to view memory visualizations</p>
        </div>
      );
    }
    
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
            <span className="text-sm text-text-secondary">Loading memory data...</span>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-4 text-red-400 bg-red-400/10 border border-red-400/20 rounded m-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error loading memories</span>
          </div>
          <p className="mt-2 text-sm">{error}</p>
          <button
            onClick={() => fetchMemories(activeMemoryType, selectedUserId)}
            className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (!memoryData || memoryData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-500 text-sm">
              No memories found for this user
            </div>
          </div>
        </div>
      );
    }
    
    switch (activeMemoryType) {
      case 'short-term':
        return <PostgresMemoryTable data={memoryData} />;
      case 'semantic':
        return <Neo4jGraphView data={memoryData} />;
      case 'long-term':
        return <QdrantScatterPlot data={memoryData} />;
      default:
        return null;
    }
  };
  
  const getMemoryTypeIcon = (type: MemoryType) => {
    switch (type) {
      case 'short-term':
        return <Table className="h-4 w-4" />;
      case 'semantic':
        return <Network className="h-4 w-4" />;
      case 'long-term':
        return <Database className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };
  
  const getMemoryTypeDescription = (type: MemoryType) => {
    switch (type) {
      case 'short-term':
        return 'Session messages and recent interactions';
      case 'semantic':
        return 'Concept relationships and knowledge graphs';
      case 'long-term':
        return 'Vector embeddings and semantic memories';
      default:
        return '';
    }
  };
  
  return (
    <div className={`
      ${isPinned ? 'relative' : 'fixed left-0 top-0'}
      h-full w-96 z-30 transition-transform duration-300 ease-in-out
      ${isPinned ? '' : isOpen ? 'translate-x-[60px]' : '-translate-x-full'}
    `}>
      <div className="h-full backdrop-blur-xl bg-white/10 dark:bg-black/10 border-r border-white/20 dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {/* Collapse button */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                aria-label="Collapse memory panel"
                title="Collapse memory panel"
              >
                <ChevronLeft className="w-5 h-5 theme-text-primary" />
              </button>
              
              {/* Pin/Unpin button */}
              <button
                onClick={onTogglePin}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                aria-label={isPinned ? "Unpin memory panel" : "Pin memory panel"}
                title={isPinned ? "Unpin memory panel" : "Pin memory panel"}
              >
                {isPinned ? (
                  <Pin className="w-5 h-5 theme-text-primary fill-current" />
                ) : (
                  <Pin className="w-5 h-5 theme-text-primary" />
                )}
              </button>
              
              {/* Title */}
              <h2 className="text-lg font-semibold theme-text-primary">
                Memory Visualization
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-accent-primary" />
            </div>
          </div>
          
          {/* Memory Type Info */}
          <div className="mb-4 p-3 rounded-lg bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5">
            <div className="flex items-center space-x-2 mb-2">
              {getMemoryTypeIcon(activeMemoryType)}
              <span className="font-medium text-sm theme-text-primary capitalize">
                {activeMemoryType.replace('-', ' ')} Memory
              </span>
            </div>
            <p className="text-xs theme-text-secondary">
              {getMemoryTypeDescription(activeMemoryType)}
            </p>
          </div>
        </div>
        
        {/* Admin User Selector */}
        {userRole === 'admin' && (
          <AdminUserSelector
            selectedUserId={selectedUserId}
            onUserSelect={setSelectedUserId}
            currentUserId={currentUserId}
          />
        )}
        
        {/* Memory Type Selector */}
        <MemoryTypeSelector
          activeType={activeMemoryType}
          onTypeChange={setActiveMemoryType}
        />
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderMemoryVisualization()}
        </div>
        
        {/* Footer Info */}
        <div className="p-3 border-t border-white/20 dark:border-white/10 backdrop-blur-md bg-white/5 dark:bg-black/5">
          <div className="text-xs theme-text-secondary text-center">
            <span className="inline-flex items-center space-x-1">
              <span>Read-only visualization</span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center space-x-1">
                <Brain className="w-3 h-3" />
                <span>Mem0 Memory System</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};