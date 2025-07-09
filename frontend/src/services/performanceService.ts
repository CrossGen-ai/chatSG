import { contentValidator } from '../security/ContentValidator';

interface PerformanceData {
  enabled: boolean;
  timestamp?: string;
  summary?: {
    totalOperations: number;
    percentiles: {
      p50: string;
      p90: string;
      p99: string;
    };
  };
  endpoints?: Record<string, any>;
  operations?: {
    memory: Record<string, any>;
    llm: Record<string, any>;
    database: Record<string, any>;
    routing: Record<string, any>;
  };
  bottlenecks?: Array<{
    type: string;
    severity: string;
    avgTime: string;
    impact: string;
  }>;
  recentOperations?: Array<{
    category: string;
    operation: string;
    duration: number;
    metadata?: any;
    timestamp: string;
  }>;
  recommendations?: Array<{
    issue: string;
    suggestions: string[];
  }>;
  message?: string;
}

class PerformanceService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  async getPerformanceData(): Promise<PerformanceData> {
    try {
      const csrfToken = await contentValidator.getCSRFToken();
      
      const response = await fetch(`${this.baseUrl}/api/performance/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken })
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch performance data: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PerformanceService] Error fetching performance data:', error);
      throw error;
    }
  }

  async clearPerformanceStats(): Promise<void> {
    try {
      const csrfToken = await contentValidator.getCSRFToken();
      
      const response = await fetch(`${this.baseUrl}/api/performance/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken })
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to clear performance stats: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[PerformanceService] Error clearing performance stats:', error);
      throw error;
    }
  }
}

export const performanceService = new PerformanceService();
export type { PerformanceData };