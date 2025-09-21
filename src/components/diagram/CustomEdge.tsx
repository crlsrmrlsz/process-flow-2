import React from 'react';
import type { EdgeProps } from 'reactflow';
import { getBezierPath } from 'reactflow';

export interface CustomEdgeData {
  count: number;
  medianTime: number;
  meanTime: number;
  isBottleneck: boolean;
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

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY: offsetSourceY,
    sourcePosition,
    targetX,
    targetY: offsetTargetY,
    targetPosition
  });

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

  const { count, medianTime, meanTime, isBottleneck, contributingVariants, performer, isHappyPath, showHappyPath } = data;


  // Clean edge styling following design guide
  const getStrokeWidth = () => {
    if (showHappyPath && isHappyPath) return 3; // Slightly thicker for happy path
    return selected ? 3 : 1.5; // Slightly wider for better visibility
  };

  // Design guide color scheme
  const getStrokeColor = () => {
    if (showHappyPath && isHappyPath) return '#4ade80'; // Green-400 for happy path
    if (selected) return '#4f46e5'; // Indigo-600 when selected
    return '#9ca3af'; // Gray-400 default, more visible
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
          fill: 'none',
          opacity: selected ? 1 : 0.8,
          strokeLinecap: 'round', // Smooth line ends
          strokeLinejoin: 'round'
        }}
        className="react-flow__edge-path transition-all duration-300 ease-out"
        d={edgePath}
        markerEnd="url(#react-flow__arrowclosed)"
      />

      {/* Mean time label - always visible, positioned further from edge */}
      <g transform={`translate(${labelX + labelOffset.x + 25}, ${labelY + labelOffset.y - 15})`}>
        {/* Clean background without border */}
        <rect
          x={-12}
          y={-7}
          width={24}
          height={14}
          rx={3}
          fill="white"
          className="drop-shadow-sm"
        />

        {/* Mean time label with larger font */}
        <text
          x={0}
          y={2}
          textAnchor="middle"
          fontSize={11}
          fontWeight="600"
          fill="#374151"
          className="pointer-events-none font-mono"
        >
          {formatTime(meanTime)}
        </text>
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