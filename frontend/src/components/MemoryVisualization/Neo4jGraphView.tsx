import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { RotateCcw, Maximize2, Minimize2, Filter } from 'lucide-react';

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

interface Neo4jGraphViewProps {
  data: Neo4jNode[];
}

export const Neo4jGraphView: React.FC<Neo4jGraphViewProps> = ({ data }) => {
  const cyRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<Neo4jNode | null>(null);
  const [layout, setLayout] = useState<string>('cose');
  const [showRelationships, setShowRelationships] = useState<boolean>(true);
  const [nodeFilter, setNodeFilter] = useState<string>('');

  // Cleanup Cytoscape instance on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (cyRef.current) {
        try {
          // Stop all animations before destroying
          cyRef.current.stop();
          // Remove all event listeners
          cyRef.current.removeAllListeners();
          // Destroy the instance
          cyRef.current.destroy();
          cyRef.current = null;
        } catch (error) {
          console.error('Error cleaning up Cytoscape:', error);
        }
      }
    };
  }, []);

  // Transform data for Cytoscape
  const elements = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const elements: any[] = [];
    const processedNodes = new Set<string>();
    const processedEdges = new Set<string>();

    // Filter nodes based on search
    const filteredData = data.filter(node => 
      nodeFilter === '' || 
      node.label.toLowerCase().includes(nodeFilter.toLowerCase()) ||
      node.content.toLowerCase().includes(nodeFilter.toLowerCase())
    );

    // Add nodes
    filteredData.forEach(node => {
      if (!processedNodes.has(node.id)) {
        elements.push({
          data: {
            id: node.id,
            label: node.label,
            content: node.content,
            metadata: node.metadata,
            type: 'node'
          },
          position: node.position || { x: Math.random() * 400, y: Math.random() * 400 }
        });
        processedNodes.add(node.id);
      }
    });

    // Add edges (relationships)
    if (showRelationships) {
      filteredData.forEach(node => {
        if (node.relationships && Array.isArray(node.relationships)) {
          node.relationships.forEach(rel => {
          const edgeId = `${node.id}-${rel.target}`;
          if (!processedEdges.has(edgeId) && processedNodes.has(rel.target)) {
            elements.push({
              data: {
                id: edgeId,
                source: node.id,
                target: rel.target,
                type: rel.type,
                properties: rel.properties,
                label: rel.type
              }
            });
            processedEdges.add(edgeId);
          }
          });
        }
      });
    }

    return elements;
  }, [data, showRelationships, nodeFilter]);

  // Cytoscape styles
  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#3b82f6',
        'width': 30,
        'height': 30,
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'text-outline-width': 1,
        'text-outline-color': '#000000',
        'border-width': 2,
        'border-color': '#1e40af',
        'overlay-padding': '6px',
        'z-index': 10
      }
    },
    {
      selector: 'node[label]',
      style: {
        'label': 'data(label)'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': '#ef4444',
        'border-color': '#dc2626',
        'border-width': 3
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#8b5cf6',
        'target-arrow-color': '#8b5cf6',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1,
        'curve-style': 'bezier',
        'font-size': '8px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'color': '#ffffff',
        'text-outline-width': 1,
        'text-outline-color': '#000000'
      }
    },
    {
      selector: 'edge[label]',
      style: {
        'label': 'data(label)'
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'width': 3
      }
    }
  ];

  // Layout options
  const layoutOptions = {
    cose: {
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 30,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    },
    circle: {
      name: 'circle',
      fit: true,
      padding: 30,
      boundingBox: undefined,
      avoidOverlap: true,
      radius: undefined,
      startAngle: (3 / 2) * Math.PI,
      sweep: undefined,
      clockwise: true,
      sort: undefined,
      animate: false,
      animationDuration: 500,
      animationEasing: undefined,
      transform: function (node: any, position: any) {
        return position;
      }
    },
    grid: {
      name: 'grid',
      fit: true,
      padding: 30,
      boundingBox: undefined,
      avoidOverlap: true,
      avoidOverlapPadding: 10,
      nodeDimensionsIncludeLabels: false,
      spacingFactor: undefined,
      condense: false,
      rows: undefined,
      cols: undefined,
      position: function (node: any) {},
      sort: undefined,
      animate: false,
      animationDuration: 500,
      animationEasing: undefined,
      transform: function (node: any, position: any) {
        return position;
      }
    },
    breadthfirst: {
      name: 'breadthfirst',
      fit: true,
      directed: false,
      padding: 30,
      circle: false,
      grid: false,
      spacingFactor: 1.75,
      boundingBox: undefined,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: false,
      roots: undefined,
      maximal: false,
      animate: false,
      animationDuration: 500,
      animationEasing: undefined,
      transform: function (node: any, position: any) {
        return position;
      }
    }
  };

  const handleNodeClick = (node: any) => {
    if (!mountedRef.current) return;
    
    const nodeData = data.find(n => n.id === node.id());
    if (nodeData) {
      setSelectedNode(nodeData);
    }
  };

  const resetLayout = () => {
    if (cyRef.current) {
      try {
        cyRef.current.fit();
        cyRef.current.center();
      } catch (error) {
        console.error('Error resetting layout:', error);
      }
    }
  };

  const fitToScreen = () => {
    if (cyRef.current) {
      try {
        cyRef.current.fit();
      } catch (error) {
        console.error('Error fitting to screen:', error);
      }
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
            {/* Layout selector */}
            <div>
              <label className="text-xs font-medium theme-text-primary mb-1 block">Layout</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 theme-text-primary text-xs"
              >
                <option value="cose">Force-directed</option>
                <option value="circle">Circle</option>
                <option value="grid">Grid</option>
                <option value="breadthfirst">Hierarchical</option>
              </select>
            </div>

            {/* Node filter */}
            <div>
              <label className="text-xs font-medium theme-text-primary mb-1 block">Filter</label>
              <input
                type="text"
                placeholder="Search nodes..."
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 theme-text-primary placeholder-gray-400 text-xs"
              />
            </div>

            {/* Relationship toggle */}
            <div>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={showRelationships}
                  onChange={(e) => setShowRelationships(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                <span className="theme-text-primary">Show relationships</span>
              </label>
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
          <RotateCcw className="w-4 h-4 theme-text-primary" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
          title="Fit to screen"
        >
          <Maximize2 className="w-4 h-4 theme-text-primary" />
        </button>
      </div>

      {/* Graph */}
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        style={{ width: '100%', height: '100%' }}
        cy={(cy) => {
          cyRef.current = cy;
          
          // Add event listeners
          cy.on('tap', 'node', (event) => {
            if (!mountedRef.current) return;
            handleNodeClick(event.target);
          });
          
          cy.on('mouseover', 'node', (event) => {
            if (!mountedRef.current) return;
            try {
              const node = event.target;
              node.style('width', '35px');
              node.style('height', '35px');
            } catch (error) {
              console.error('Error in node mouseover:', error);
            }
          });
          
          cy.on('mouseout', 'node', (event) => {
            if (!mountedRef.current) return;
            try {
              const node = event.target;
              if (!node.selected()) {
                node.style('width', '30px');
                node.style('height', '30px');
              }
            } catch (error) {
              console.error('Error in node mouseout:', error);
            }
          });
          
          // Edge hover effects
          cy.on('mouseover', 'edge', (event) => {
            if (!mountedRef.current) return;
            try {
              const edge = event.target;
              edge.style('line-color', '#a855f7');
              edge.style('target-arrow-color', '#a855f7');
              edge.style('width', 3);
            } catch (error) {
              console.error('Error in edge mouseover:', error);
            }
          });
          
          cy.on('mouseout', 'edge', (event) => {
            if (!mountedRef.current) return;
            try {
              const edge = event.target;
              if (!edge.selected()) {
                edge.style('line-color', '#8b5cf6');
                edge.style('target-arrow-color', '#8b5cf6');
                edge.style('width', 2);
              }
            } catch (error) {
              console.error('Error in edge mouseout:', error);
            }
          });
        }}
        layout={layoutOptions[layout as keyof typeof layoutOptions]}
      />

      {/* Node info panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-3 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-sm theme-text-primary">Node Details</div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-white/10 dark:hover:bg-black/10 rounded transition-colors"
            >
              <span className="text-xs theme-text-secondary">×</span>
            </button>
          </div>
          
          <div className="text-xs space-y-2">
            <div>
              <span className="text-gray-400">Label:</span>
              <div className="text-white mt-1 font-medium">{selectedNode.label}</div>
            </div>
            
            <div>
              <span className="text-gray-400">Content:</span>
              <div className="text-white mt-1 max-h-20 overflow-y-auto">
                {selectedNode.content}
              </div>
            </div>
            
            <div>
              <span className="text-gray-400">Relationships:</span>
              <div className="text-white mt-1">
                {selectedNode.relationships.length} connection(s)
              </div>
            </div>
            
            {selectedNode.relationships.length > 0 && (
              <div>
                <span className="text-gray-400">Connected to:</span>
                <div className="text-white mt-1 space-y-1">
                  {selectedNode.relationships.slice(0, 3).map(rel => (
                    <div key={rel.id} className="flex items-center space-x-2">
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">
                        {rel.type}
                      </span>
                      <span className="text-xs">{rel.target}</span>
                    </div>
                  ))}
                  {selectedNode.relationships.length > 3 && (
                    <div className="text-xs text-gray-400">
                      +{selectedNode.relationships.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-3">
        <div className="text-xs font-medium theme-text-primary mb-2">Legend</div>
        <div className="space-y-1 text-xs theme-text-secondary">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Memory Node</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-purple-500"></div>
            <span>Relationship</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Selected</span>
          </div>
          <div className="text-xs mt-2">
            <span className="text-gray-400">Nodes:</span> {elements.filter(e => e.data.type === 'node').length}
          </div>
          <div className="text-xs">
            <span className="text-gray-400">Edges:</span> {elements.filter(e => e.data.type !== 'node').length}
          </div>
        </div>
      </div>
    </div>
  );
};