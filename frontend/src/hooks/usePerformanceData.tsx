import { useState, useEffect, useCallback } from 'react';
import { performanceService, PerformanceData } from '../services/performanceService';

interface UsePerformanceDataResult {
  data: PerformanceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearStats: () => Promise<void>;
}

export function usePerformanceData(autoRefresh = true, refreshInterval = 5000): UsePerformanceDataResult {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const performanceData = await performanceService.getPerformanceData();
      setData(performanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
      console.error('[usePerformanceData] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearStats = useCallback(async () => {
    try {
      setLoading(true);
      await performanceService.clearPerformanceStats();
      // Refresh data after clearing
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear performance stats');
      console.error('[usePerformanceData] Clear error:', err);
    }
  }, [fetchData]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    clearStats
  };
}