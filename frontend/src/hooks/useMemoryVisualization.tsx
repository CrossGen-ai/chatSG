import { useState, useCallback } from 'react';
import type { MemoryType } from '../components/MemoryVisualization/MemoryPanel';

interface MemoryVisualizationState {
  memoryData: any[] | null;
  loading: boolean;
  error: string | null;
}

interface MemoryVisualizationHook extends MemoryVisualizationState {
  fetchMemories: (memoryType: MemoryType, userId: string) => Promise<void>;
  clearError: () => void;
  clearData: () => void;
}

export const useMemoryVisualization = (): MemoryVisualizationHook => {
  const [state, setState] = useState<MemoryVisualizationState>({
    memoryData: null,
    loading: false,
    error: null
  });

  const fetchMemories = useCallback(async (memoryType: MemoryType, userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let endpoint = '';
      
      // Map memory type to API endpoint
      switch (memoryType) {
        case 'short-term':
          endpoint = `/api/memory/postgres/${userId}`;
          break;
        case 'semantic':
          endpoint = `/api/memory/neo4j/${userId}`;
          break;
        case 'long-term':
          endpoint = `/api/memory/qdrant/${userId}`;
          break;
        default:
          throw new Error(`Unknown memory type: ${memoryType}`);
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        } else if (response.status === 403) {
          throw new Error('Access denied - insufficient permissions');
        } else {
          throw new Error(`Failed to fetch memories: ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch memories');
      }

      setState(prev => ({
        ...prev,
        memoryData: data.data || [],
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching memories:', error);
      
      setState(prev => ({
        ...prev,
        memoryData: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch memories'
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearData = useCallback(() => {
    setState({
      memoryData: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    memoryData: state.memoryData,
    loading: state.loading,
    error: state.error,
    fetchMemories,
    clearError,
    clearData
  };
};