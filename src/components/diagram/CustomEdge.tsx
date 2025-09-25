import React from 'react';
import type { EdgeProps } from 'reactflow';
import { getBezierPath } from 'reactflow';

export interface CustomEdgeData {
  count: number;
  medianTime: number;
  meanTime: number;
  isBottleneck: boolean;
  expectedTime?: number;
  contributingVariants?: Array<{
    variant_id: string;
    count: number;
    median_time_hours: number;
  }>;
  performer_breakdown?: Record<string, { count: number; median_time_hours: number; mean_time_hours: number }>;
  performer?: string; // For split edges
  originalTransition?: string; // For split edges
  performerIndex?: number; // Index of performer for positioning
  totalPerformers?: number; // Total number of performers for this transition
  isHappyPath?: boolean;
  showHappyPath?: boolean;
  showBottlenecks?: boolean;
  isBackward?: boolean; // Indicates if this edge should use left-side routing with high curvature
}

export const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  // Calculate edge path offset for multiple performer edges
  const edgeOffset = React.useMemo(() => {
    if (!data?.performerIndex || !data?.totalPerformers || data.totalPerformers <= 1) {
      return 0;
    }

    // Create offset for multiple edges: spread them vertically
    const maxOffset = 60; // Maximum offset in pixels
    const step = maxOffset / Math.max(1, data.totalPerformers - 1);
    return (data.performerIndex - (data.totalPerformers - 1) / 2) * step;
  }, [data?.performerIndex, data?.totalPerformers]);

  // Apply offset to source and target coordinates
  const offsetSourceY = sourceY + edgeOffset;
  const offsetTargetY = targetY + edgeOffset;

  // Create custom path for backward edges or use standard bezier path
  const [edgePath, labelX, labelY] = React.useMemo(() => {
    if (data?.isBackward) {
      // Create custom curved path for backward edges to avoid node overlap
      const midX = Math.min(sourceX, targetX) - 100; // Curve to the left of both nodes
      const midY = (offsetSourceY + offsetTargetY) / 2;

      // Create smooth curved path with high curvature
      const path = `M ${sourceX} ${offsetSourceY}
                    C ${sourceX - 50} ${offsetSourceY}, ${midX} ${offsetSourceY}, ${midX} ${midY}
                    C ${midX} ${offsetTargetY}, ${targetX - 50} ${offsetTargetY}, ${targetX} ${offsetTargetY}`;

      const labelPosX = midX;
      const labelPosY = midY;

      return [path, labelPosX, labelPosY];
    } else {
      // Use standard bezier path for normal edges
      return getBezierPath({
        sourceX,
        sourceY: offsetSourceY,
        sourcePosition,
        targetX,
        targetY: offsetTargetY,
        targetPosition
      });
    }
  }, [data?.isBackward, sourceX, sourceY, targetX, targetY, offsetSourceY, offsetTargetY, sourcePosition, targetPosition]);

  // Use the backward edge information from edge data instead of position-based detection

  // Calculate label offset (smaller since path is already offset)
  const labelOffset = React.useMemo(() => {
    if (!data?.performerIndex || !data?.totalPerformers || data.totalPerformers <= 1) {
      return { x: 0, y: 0 };
    }

    // Smaller label offset since the path is already separated
    const indexOffset = (data.performerIndex - (data.totalPerformers - 1) / 2) * 8;

    return {
      x: indexOffset * 0.3, // Small horizontal offset
      y: indexOffset * 0.5 // Small vertical offset
    };
  }, [data?.performerIndex, data?.totalPerformers]);

  if (!data) return null;

  const { count, medianTime, meanTime, isBottleneck, expectedTime, performer, isHappyPath, showHappyPath, showBottlenecks } = data;


  // Clean edge styling following design guide
  const getStrokeWidth = () => {
    // Happy path takes priority over bottlenecks when both are enabled
    if (showHappyPath && isHappyPath) return 3; // Slightly thicker for happy path
    if (showBottlenecks && isBottleneck) return 4; // Thicker for bottlenecks
    return selected ? 3 : 2; // Increased base thickness for better visibility
  };

  // Design guide color scheme with more prominent colors
  const getStrokeColor = () => {
    // Happy path takes priority over bottlenecks when both are enabled
    if (showHappyPath && isHappyPath) return '#22c55e'; // Bright green for happy path
    if (showBottlenecks && isBottleneck) return '#ef4444'; // Bright red for bottlenecks
    if (selected) return '#4f46e5'; // Indigo-600 when selected
    return '#9ca3af'; // Gray-400 default
  };

  // Add dashed style for bottlenecks (but not for happy path)
  const getStrokeDasharray = () => {
    // Happy path should always be solid lines
    if (showHappyPath && isHappyPath) return undefined; // Solid line for happy path
    if (showBottlenecks && isBottleneck) return '8 4'; // Dashed pattern for bottlenecks
    return undefined; // Solid line for others
  };

  const formatTime = (hours: number) => {
    if (hours < 1) return `${(hours * 60).toFixed(0)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <>
      {/* Main edge path - clean, minimal design */}
      <path
        id={id}
        style={{
          stroke: getStrokeColor(),
          strokeWidth: getStrokeWidth(),
          strokeDasharray: getStrokeDasharray(),
          fill: 'none',
          opacity: selected ? 1 : 0.8,
          strokeLinecap: 'round', // Smooth line ends
          strokeLinejoin: 'round'
        }}
        className={`react-flow__edge-path transition-all duration-300 ease-out ${data?.isBackward ? 'backward-edge-path' : ''}`}
        d={edgePath}
        markerEnd="url(#react-flow__arrowclosed)"
      />

      {/* Clean edge label - shows mean time or expected time comparison for bottlenecks */}
      <g transform={`translate(${labelX + labelOffset.x}, ${labelY + labelOffset.y - 20})`}>
        {(() => {
          // Determine label content based on bottleneck status
          const showExpectedTime = showBottlenecks && isBottleneck && expectedTime;
          const labelText = showExpectedTime
            ? `mean: ${formatTime(meanTime)}, expected: ${formatTime(expectedTime)}`
            : formatTime(meanTime);

          // Calculate background width based on text length
          const baseWidth = showExpectedTime ? labelText.length * 6.5 : 24;
          const width = Math.max(baseWidth, 24);

          return (
            <>
              {/* Dynamic background based on content */}
              <rect
                x={-width / 2}
                y={-7}
                width={width}
                height={14}
                rx={3}
                fill="white"
                className="drop-shadow-sm"
              />

              {/* Label text */}
              <text
                x={0}
                y={2}
                textAnchor="middle"
                fontSize={showExpectedTime ? 10 : 12}
                fontWeight="600"
                fill="#374151"
                className="pointer-events-none font-mono"
              >
                {labelText}
              </text>
            </>
          );
        })()}
      </g>


      {/* Hover tooltip area (invisible but larger for better interaction) */}
      <path
        d={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: 20, // Wide invisible area for easier clicking
          fill: 'none'
        }}
        className="react-flow__edge-interaction"
      >
        <title>
          {`${count} cases\nMedian: ${formatTime(medianTime)}`}
          {performer ? `\nPerformer: ${performer}` : ''}
        </title>
      </path>
    </>
  );
};