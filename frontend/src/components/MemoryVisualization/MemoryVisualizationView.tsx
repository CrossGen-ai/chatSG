import React from 'react';
import { MemoryType } from './MemoryPanel';
import { PostgresMemoryTable } from './PostgresMemoryTable';
import { Neo4jGraphView } from './Neo4jGraphView';
import { QdrantScatterPlot } from './QdrantScatterPlot';
import { NvlGraphView } from './NvlGraphView';
import { useMemoryVisualization } from '../../hooks/useMemoryVisualization';

// Error boundary component for catching render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Memory visualization error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="p-4 text-red-400 bg-red-400/10 border border-red-400/20 rounded">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error rendering visualization</span>
            </div>
            <p className="mt-2 text-sm">{this.state.error?.message || 'Unknown error'}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface MemoryVisualizationViewProps {
  activeMemoryType: MemoryType;
  selectedUserId: string;
}

export const MemoryVisualizationView: React.FC<MemoryVisualizationViewProps> = ({
  activeMemoryType,
  selectedUserId
}) => {
  const { 
    memoryData, 
    loading, 
    error, 
    fetchMemories,
    clearError
  } = useMemoryVisualization();

  // Fetch memories when user or memory type changes
  React.useEffect(() => {
    if (selectedUserId && selectedUserId !== '') {
      fetchMemories(activeMemoryType, selectedUserId);
    }
  }, [activeMemoryType, selectedUserId, fetchMemories]);

  // Clear error when memory type changes
  React.useEffect(() => {
    if (error) {
      clearError();
    }
  }, [activeMemoryType, clearError]);

  if (!selectedUserId || selectedUserId === '') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-4 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Authentication Required</span>
          </div>
          <p className="mt-2 text-sm">Please log in to view memory visualizations</p>
        </div>
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
      <div className="flex items-center justify-center h-full">
        <div className="p-4 text-red-400 bg-red-400/10 border border-red-400/20 rounded">
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
      return (
        <ErrorBoundary>
          <PostgresMemoryTable data={memoryData} />
        </ErrorBoundary>
      );
    case 'semantic':
      return (
        <ErrorBoundary>
          <Neo4jGraphView data={memoryData} />
        </ErrorBoundary>
      );
    case 'long-term':
      return (
        <ErrorBoundary>
          <QdrantScatterPlot data={memoryData} />
        </ErrorBoundary>
      );
    case 'neo4j-graph':
      return (
        <ErrorBoundary>
          <NvlGraphView data={memoryData} />
        </ErrorBoundary>
      );
    default:
      return null;
  }
};