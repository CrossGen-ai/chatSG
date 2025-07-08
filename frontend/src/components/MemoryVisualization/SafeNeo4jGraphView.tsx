import React from 'react';

interface Neo4jNode {
  id: string;
  label: string;
  content: string;
  metadata: Record<string, any>;
  relationships: Array<{
    id: string;
    type: string;
    target: string;
    properties: Record<string, any>;
  }>;
  position?: {
    x: number;
    y: number;
  };
}

interface SafeNeo4jGraphViewProps {
  data: Neo4jNode[];
}

export const SafeNeo4jGraphView: React.FC<SafeNeo4jGraphViewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            No semantic memories found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 overflow-auto">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-2xl p-6 border border-white/20 dark:border-white/10">
        <h3 className="text-lg font-semibold theme-text-primary mb-4">
          Neo4j Memory Graph Nodes
        </h3>
        
        <div className="space-y-4">
          {data.map((node) => (
            <div
              key={node.id}
              className="bg-white/5 dark:bg-black/5 rounded-lg p-4 border border-white/10 dark:border-white/5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <h4 className="font-medium theme-text-primary">{node.label}</h4>
                </div>
                <div className="text-xs theme-text-secondary">
                  ID: {node.id.substring(0, 8)}...
                </div>
              </div>
              
              <p className="text-sm theme-text-secondary mb-3">{node.content}</p>
              
              {node.relationships.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/5">
                  <div className="text-xs font-medium theme-text-primary mb-2">
                    Relationships ({node.relationships.length})
                  </div>
                  <div className="space-y-1">
                    {node.relationships.map((rel, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs">
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                          {rel.type}
                        </span>
                        <span className="theme-text-secondary">→</span>
                        <span className="theme-text-secondary">{rel.target.substring(0, 8)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {node.metadata && Object.keys(node.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/5">
                  <div className="text-xs font-medium theme-text-primary mb-2">
                    Metadata
                  </div>
                  <div className="text-xs theme-text-secondary">
                    {Object.entries(node.metadata).map(([key, value]) => (
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
              Neo4j graph visualization temporarily showing as a list. Interactive graph coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};