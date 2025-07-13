import React from 'react';
import { Database, Network, Table, GitBranch } from 'lucide-react';

export type MemoryType = 'short-term' | 'semantic' | 'long-term' | 'neo4j-graph';

interface MemoryTypeSelectorProps {
  activeType: MemoryType;
  onTypeChange: (type: MemoryType) => void;
}

const memoryTypes: Array<{
  id: MemoryType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}> = [
  {
    id: 'short-term',
    label: 'Short-term',
    icon: Table,
    description: 'Session messages and recent interactions',
    color: 'text-blue-500'
  },
  {
    id: 'semantic',
    label: 'Semantic',
    icon: Network,
    description: 'Concept relationships and knowledge graphs',
    color: 'text-purple-500'
  },
  {
    id: 'long-term',
    label: 'Long-term',
    icon: Database,
    description: 'Vector embeddings and semantic memories',
    color: 'text-emerald-500'
  },
  {
    id: 'neo4j-graph',
    label: 'Neo4j Graph',
    icon: GitBranch,
    description: 'Real Neo4j relationships with NVL',
    color: 'text-orange-500'
  }
];

export const MemoryTypeSelector: React.FC<MemoryTypeSelectorProps> = ({
  activeType,
  onTypeChange
}) => {
  return (
    <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/5 dark:bg-black/5">
      <div className="space-y-2">
        {memoryTypes.map(({ id, label, icon: Icon, description, color }) => (
          <button
            key={id}
            onClick={() => onTypeChange(id)}
            className={`
              w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
              ${activeType === id 
                ? 'bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 shadow-lg' 
                : 'hover:bg-white/10 dark:hover:bg-white/5 border border-transparent'
              }
            `}
            aria-label={`Switch to ${label} memory view`}
          >
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
              ${activeType === id 
                ? 'bg-white/20 dark:bg-black/20' 
                : 'bg-white/10 dark:bg-black/10'
              }
            `}>
              <Icon className={`w-5 h-5 ${activeType === id ? color : 'theme-text-secondary'}`} />
            </div>
            
            <div className="flex-1 text-left">
              <div className={`
                font-medium text-sm
                ${activeType === id ? 'theme-text-primary' : 'theme-text-secondary'}
              `}>
                {label} Memory
              </div>
              <div className="text-xs theme-text-secondary mt-1">
                {description}
              </div>
            </div>
            
            {activeType === id && (
              <div className="flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Active Type Summary */}
      <div className="mt-4 p-3 rounded-lg bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/5">
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-xs font-medium theme-text-primary">
            Current View
          </div>
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${activeType === 'short-term' ? 'bg-blue-500/20 text-blue-400' : ''}
            ${activeType === 'semantic' ? 'bg-purple-500/20 text-purple-400' : ''}
            ${activeType === 'long-term' ? 'bg-emerald-500/20 text-emerald-400' : ''}
            ${activeType === 'neo4j-graph' ? 'bg-orange-500/20 text-orange-400' : ''}
          `}>
            {memoryTypes.find(t => t.id === activeType)?.label}
          </div>
        </div>
        
        <div className="text-xs theme-text-secondary">
          {activeType === 'short-term' && 'PostgreSQL sessions and messages with advanced filtering'}
          {activeType === 'semantic' && 'Neo4j graph relationships with interactive node exploration'}
          {activeType === 'long-term' && 'Qdrant vector embeddings with similarity visualization'}
          {activeType === 'neo4j-graph' && 'Native Neo4j visualization with real relationship types'}
        </div>
      </div>
    </div>
  );
};