import React from 'react';

interface QdrantDataPoint {
  id: string;
  content: string;
  position: {
    x: number;
    y: number;
  };
  vector: number[];
  score?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface SafeQdrantScatterPlotProps {
  data: QdrantDataPoint[];
}

export const SafeQdrantScatterPlot: React.FC<SafeQdrantScatterPlotProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            No vector memories found
          </div>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="h-full w-full p-4 overflow-auto">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-2xl p-6 border border-white/20 dark:border-white/10">
        <h3 className="text-lg font-semibold theme-text-primary mb-4">
          Qdrant Vector Memories
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((point) => (
            <div
              key={point.id}
              className="bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-white/10 dark:border-white/5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <h4 className="font-medium theme-text-primary text-sm">Vector Memory</h4>
                </div>
                <div className="text-xs theme-text-secondary">
                  ID: {point.id.substring(0, 8)}...
                </div>
              </div>
              
              <p className="text-sm theme-text-secondary mb-3 line-clamp-3">{point.content}</p>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="theme-text-secondary">Position:</span>
                  <span className="font-mono theme-text-primary">
                    ({point.position.x.toFixed(2)}, {point.position.y.toFixed(2)})
                  </span>
                </div>
                
                {point.score !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="theme-text-secondary">Score:</span>
                    <span className="font-mono theme-text-primary">{point.score.toFixed(3)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="theme-text-secondary">Vector dims:</span>
                  <span className="font-mono theme-text-primary">{point.vector?.length || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="theme-text-secondary">Created:</span>
                  <span className="theme-text-primary">{formatTimestamp(point.timestamp)}</span>
                </div>
              </div>
              
              {point.metadata && Object.keys(point.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/5">
                  <div className="text-xs font-medium theme-text-primary mb-2">
                    Metadata
                  </div>
                  <div className="text-xs theme-text-secondary space-y-1">
                    {Object.entries(point.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-yellow-500">
              Qdrant scatter plot visualization temporarily showing as cards. Interactive plot coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};