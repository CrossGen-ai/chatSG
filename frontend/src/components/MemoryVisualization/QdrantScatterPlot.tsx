import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

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

interface QdrantScatterPlotProps {
  data: QdrantDataPoint[];
}

export const QdrantScatterPlot: React.FC<QdrantScatterPlotProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: QdrantDataPoint | null;
  }>({ visible: false, x: 0, y: 0, content: null });
  const [selectedPoint, setSelectedPoint] = useState<QdrantDataPoint | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    
    // Clear previous content
    svg.selectAll('*').remove();

    // Set up dimensions
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height - 100; // Leave space for controls

    svg.attr('width', width).attr('height', height);

    // Create scales
    const xExtent = d3.extent(data, d => d.position.x) as [number, number];
    const yExtent = d3.extent(data, d => d.position.y) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([40, width - 40]);

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([height - 40, 40]);

    // Create color scale based on score or timestamp
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain(d3.extent(data, d => d.score || 0) as [number, number]);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const { transform } = event;
        svg.select('.plot-area').attr('transform', transform);
      });

    svg.call(zoom);

    // Create plot area group
    const plotArea = svg.append('g').attr('class', 'plot-area');

    // Add axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - 40})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', 'currentColor')
      .style('font-size', '12px');

    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', 'translate(40, 0)')
      .call(yAxis)
      .selectAll('text')
      .style('fill', 'currentColor')
      .style('font-size', '12px');

    // Add axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .style('fill', 'currentColor')
      .style('font-size', '12px')
      .text('Vector Dimension 1');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('fill', 'currentColor')
      .style('font-size', '12px')
      .text('Vector Dimension 2');

    // Add data points
    plotArea.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.position.x))
      .attr('cy', d => yScale(d.position.y))
      .attr('r', 4)
      .attr('fill', d => colorScale(d.score || 0))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Increase point size on hover
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .attr('stroke-width', 2);

        // Show tooltip
        const [mouseX, mouseY] = d3.pointer(event, container);
        setTooltip({
          visible: true,
          x: mouseX,
          y: mouseY,
          content: d
        });
      })
      .on('mouseout', function() {
        // Reset point size
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)
          .attr('stroke-width', 0.5);

        // Hide tooltip
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('click', function(event, d) {
        setSelectedPoint(d);
      });

    // Add zoom controls
    const controls = svg.append('g')
      .attr('class', 'controls')
      .attr('transform', `translate(${width - 100}, 10)`);

    // Reset zoom button
    controls.append('rect')
      .attr('width', 30)
      .attr('height', 30)
      .attr('rx', 4)
      .attr('fill', 'rgba(255,255,255,0.1)')
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .style('cursor', 'pointer')
      .on('click', () => {
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });

    controls.append('text')
      .attr('x', 15)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('fill', 'currentColor')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .text('⌂');

  }, [data]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const resetZoom = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition()
        .duration(750)
        .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            No vector data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          className="absolute z-50 bg-black/90 text-white p-3 rounded-lg shadow-lg max-w-sm pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-medium text-sm mb-2">Vector Memory</div>
          <div className="text-xs space-y-1">
            <div>
              <span className="text-gray-400">Content:</span>
              <div className="text-white mt-1">
                {tooltip.content.content.length > 100 
                  ? tooltip.content.content.substring(0, 100) + '...' 
                  : tooltip.content.content}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Score:</span> {tooltip.content.score?.toFixed(3)}
            </div>
            <div>
              <span className="text-gray-400">Created:</span> {formatTimestamp(tooltip.content.timestamp)}
            </div>
            <div>
              <span className="text-gray-400">Vector Dims:</span> {tooltip.content.vector?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={resetZoom}
          className="p-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
          title="Reset zoom"
        >
          <RotateCcw className="w-4 h-4 theme-text-primary" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-3">
        <div className="text-xs font-medium theme-text-primary mb-2">Legend</div>
        <div className="space-y-1 text-xs theme-text-secondary">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-green-500"></div>
            <span>Similarity Score</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full border border-white/50"></div>
            <span>Hover for details</span>
          </div>
          <div className="text-xs mt-2">
            <span className="text-gray-400">Points:</span> {data.length}
          </div>
        </div>
      </div>

      {/* Selected Point Info */}
      {selectedPoint && (
        <div className="absolute top-4 left-4 bg-white/10 dark:bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-3 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-sm theme-text-primary">Selected Memory</div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="p-1 hover:bg-white/10 dark:hover:bg-black/10 rounded transition-colors"
            >
              <span className="text-xs theme-text-secondary">×</span>
            </button>
          </div>
          <div className="text-xs space-y-2">
            <div>
              <span className="text-gray-400">Content:</span>
              <div className="text-white mt-1 max-h-20 overflow-y-auto">
                {selectedPoint.content}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Score:</span> {selectedPoint.score?.toFixed(3)}
            </div>
            <div>
              <span className="text-gray-400">Position:</span> ({selectedPoint.position.x.toFixed(2)}, {selectedPoint.position.y.toFixed(2)})
            </div>
            <div>
              <span className="text-gray-400">Vector:</span> {selectedPoint.vector?.length || 0} dimensions
            </div>
          </div>
        </div>
      )}
    </div>
  );
};