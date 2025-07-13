import React, { useState, useRef, useEffect } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import type { Node, Relationship, NvlOptions } from '@neo4j-nvl/base';
import { RefreshCw, Maximize2, Filter, GitBranch } from 'lucide-react';

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

interface NvlGraphViewProps {
  data: Neo4jNode[];
}

export const NvlGraphView: React.FC<NvlGraphViewProps> = ({ data }) => {
  const nvlRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [nodeFilter, setNodeFilter] = useState<string>('');
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState<string>('all');

  // Get color for relationship type
  const getRelationshipColor = (type: string): string => {
    const colors: Record<string, string> = {
      'RELATES_TO': '#999999',
      'KNOWS': '#ffa500',
      'WORKS_AT': '#9b59b6',
      'MANAGES': '#e74c3c',
      'CONTRIBUTES_TO': '#3498db',
      'FOLLOWS': '#2ecc71',
      'SIMILAR_TO': '#f39c12',
      'DERIVED_FROM': '#16a085',
      'CONNECTED_TO': '#34495e'
    };
    return colors[type] || '#666666';
  };

  // Transform Neo4j data to NVL format
  const { nodes, relationships, relationshipTypes } = React.useMemo(() => {
    if (!data || data.length === 0) return { nodes: [], relationships: [], relationshipTypes: new Set<string>() };

    const nvlNodes: Node[] = [];
    const nvlRelationships: Relationship[] = [];
    const relTypes = new Set<string>();
    const processedRelationships = new Set<string>();

    // Filter nodes based on search
    const filteredData = data.filter(node => 
      nodeFilter === '' || 
      node.label.toLowerCase().includes(nodeFilter.toLowerCase()) ||
      node.content.toLowerCase().includes(nodeFilter.toLowerCase())
    );

    // Create nodes
    filteredData.forEach(node => {
      nvlNodes.push({
        id: node.id,
        labels: ['Memory'],
        properties: {
          name: node.label,
          content: node.content,
          ...node.metadata
        },
        // Style properties
        color: '#4287f5',
        size: 40,
        icon: 'brain',
        caption: node.label
      });
    });

    // Create relationships
    filteredData.forEach(node => {
      if (node.relationships && Array.isArray(node.relationships)) {
        node.relationships.forEach(rel => {
          const relId = `${node.id}-${rel.type}-${rel.target}`;
          if (!processedRelationships.has(relId) && filteredData.some(n => n.id === rel.target)) {
            relTypes.add(rel.type);
            
            if (relationshipTypeFilter === 'all' || relationshipTypeFilter === rel.type) {
              nvlRelationships.push({
                id: rel.id,
                from: node.id,
                to: rel.target,
                type: rel.type,
                properties: rel.properties || {},
                // Style properties
                color: getRelationshipColor(rel.type),
                width: 2,
                caption: rel.type
              });
              processedRelationships.add(relId);
            }
          }
        });
      }
    });

    return { nodes: nvlNodes, relationships: nvlRelationships, relationshipTypes: relTypes };
  }, [data, nodeFilter, relationshipTypeFilter]);

  // NVL configuration options
  const nvlOptions: NvlOptions = {
    initialZoom: 0.8,
    layout: 'force-directed',
    renderer: 'canvas', // Use canvas to display captions
    disableWebGL: false,
    relationshipThreshold: 0.55,
    nonLayoutAnimationDuration: 500,
    layoutAnimationDuration: 1000,
    nodeSize: 40,
    iconFontFamily: 'Font Awesome 5 Free',
    useWebGL: true,
    backgroundColor: 'transparent'
  };

  // Event callbacks
  const nvlCallbacks = {
    onLayoutDone: () => {
      console.log('[NVL] Layout completed');
    },
    onZoomChanged: (zoomLevel: number) => {
      console.log('[NVL] Zoom level:', zoomLevel);
    },
    onNodeClick: (node: Node) => {
      setSelectedNode(node);
      setSelectedRelationship(null);
    },
    onRelationshipClick: (relationship: Relationship) => {
      setSelectedRelationship(relationship);
      setSelectedNode(null);
    },
    onCanvasClick: () => {
      setSelectedNode(null);
      setSelectedRelationship(null);
    }
  };

  // Mouse event callbacks
  const mouseEventCallbacks = {
    onNodeHover: (node: Node | null) => {
      if (node && nvlRef.current) {
        // Highlight connected nodes
        const connectedNodeIds = new Set<string>();
        relationships.forEach(rel => {
          if (rel.from === node.id) connectedNodeIds.add(rel.to);
          if (rel.to === node.id) connectedNodeIds.add(rel.from);
        });
        
        // Update node styles
        const updatedNodes = nodes.map(n => ({
          id: n.id,
          size: n.id === node.id ? 50 : (connectedNodeIds.has(n.id) ? 45 : 40),
          color: n.id === node.id ? '#ff6b6b' : (connectedNodeIds.has(n.id) ? '#4dabf7' : '#4287f5')
        }));
        
        nvlRef.current.updateElements(updatedNodes, []);
      }
    },
    onRelationshipHover: (relationship: Relationship | null) => {
      if (relationship && nvlRef.current) {
        // Highlight the relationship
        const updatedRelationships = relationships.map(r => ({
          id: r.id,
          width: r.id === relationship.id ? 4 : 2,
          color: r.id === relationship.id ? '#ff6b6b' : getRelationshipColor(r.type)
        }));
        
        nvlRef.current.updateElements([], updatedRelationships);
      }
    },
    onPan: true,
    onZoom: true,
    onDrag: true
  };

  // Reset layout
  const resetLayout = () => {
    if (nvlRef.current) {
      nvlRef.current.fit();
      nvlRef.current.resetLayout();
    }
  };

  // Fit to screen
  const fitToScreen = () => {
    if (nvlRef.current) {
      nvlRef.current.fit();
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            No graph data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className="bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-2">
          <div className="flex flex-col space-y-2">
            {/* Node filter */}
            <div>
              <label className="text-xs font-medium theme-text-primary mb-1 block">Filter Nodes</label>
              <input
                type="text"
                placeholder="Search nodes..."
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 theme-text-primary placeholder-gray-400 text-xs"
              />
            </div>

            {/* Relationship type filter */}
            <div>
              <label className="text-xs font-medium theme-text-primary mb-1 block">Relationship Type</label>
              <select
                value={relationshipTypeFilter}
                onChange={(e) => setRelationshipTypeFilter(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 theme-text-primary text-xs"
              >
                <option value="all">All Types</option>
                {Array.from(relationshipTypes).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Statistics */}
            <div className="text-xs theme-text-secondary pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span>Nodes:</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Relationships:</span>
                <span className="font-medium">{relationships.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={resetLayout}
          className="p-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
          title="Reset layout"
        >
          <RefreshCw className="w-4 h-4 theme-text-primary" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
          title="Fit to screen"
        >
          <Maximize2 className="w-4 h-4 theme-text-primary" />
        </button>
      </div>

      {/* NVL Graph */}
      <div className="absolute inset-0">
        <InteractiveNvlWrapper
          ref={nvlRef}
          nodes={nodes}
          rels={relationships}
          nvlOptions={nvlOptions}
          nvlCallbacks={nvlCallbacks}
          mouseEventCallbacks={mouseEventCallbacks}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Info panel */}
      {(selectedNode || selectedRelationship) && (
        <div className="absolute bottom-4 left-4 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-3 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-sm theme-text-primary">
              {selectedNode ? 'Node Details' : 'Relationship Details'}
            </div>
            <button
              onClick={() => {
                setSelectedNode(null);
                setSelectedRelationship(null);
              }}
              className="p-1 hover:bg-white/10 dark:hover:bg-black/10 rounded transition-colors"
            >
              <span className="text-xs theme-text-secondary">×</span>
            </button>
          </div>
          
          <div className="text-xs space-y-2">
            {selectedNode && (
              <>
                <div>
                  <span className="text-gray-400">Label:</span>
                  <div className="text-white mt-1 font-medium">{selectedNode.properties?.name || selectedNode.id}</div>
                </div>
                
                {selectedNode.properties?.content && (
                  <div>
                    <span className="text-gray-400">Content:</span>
                    <div className="text-white mt-1 max-h-20 overflow-y-auto">
                      {selectedNode.properties.content}
                    </div>
                  </div>
                )}
                
                <div>
                  <span className="text-gray-400">Connections:</span>
                  <div className="text-white mt-1">
                    {relationships.filter(r => r.from === selectedNode.id || r.to === selectedNode.id).length} relationship(s)
                  </div>
                </div>
              </>
            )}
            
            {selectedRelationship && (
              <>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <div className="text-white mt-1 font-medium">{selectedRelationship.type}</div>
                </div>
                
                <div>
                  <span className="text-gray-400">From → To:</span>
                  <div className="text-white mt-1">
                    {nodes.find(n => n.id === selectedRelationship.from)?.properties?.name || selectedRelationship.from}
                    {' → '}
                    {nodes.find(n => n.id === selectedRelationship.to)?.properties?.name || selectedRelationship.to}
                  </div>
                </div>
                
                {Object.keys(selectedRelationship.properties || {}).length > 0 && (
                  <div>
                    <span className="text-gray-400">Properties:</span>
                    <div className="text-white mt-1">
                      {JSON.stringify(selectedRelationship.properties, null, 2)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-3">
        <div className="text-xs font-medium theme-text-primary mb-2 flex items-center space-x-1">
          <GitBranch className="w-3 h-3" />
          <span>Neo4j NVL Visualization</span>
        </div>
        <div className="space-y-1 text-xs theme-text-secondary">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Memory Node</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Selected/Hover</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span>Connected</span>
          </div>
          <div className="text-xs mt-2">
            <span className="text-gray-400">Types:</span> {relationshipTypes.size}
          </div>
        </div>
      </div>
    </div>
  );
};