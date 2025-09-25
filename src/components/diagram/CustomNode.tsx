import React from 'react';
import { Handle, Position } from 'reactflow';

export interface CustomNodeData {
  label: string;
  count: number;
  isBottleneck: boolean;
  isStart: boolean;
  isEnd: boolean;
  isHappyPath?: boolean;
  showHappyPath?: boolean;
  calculatedWidth?: number;
}

interface CustomNodeProps {
  data: CustomNodeData;
  selected: boolean;
}

export const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const { label, count, isStart, isEnd, isHappyPath, showHappyPath, calculatedWidth } = data;

  // Check if this is a final node that should show total time
  const isFinalNode = label === 'approved' || label === 'rejected' || label === 'withdrawn';

  // Get node styling - use consistent approach with inline styles to avoid conflicts
  const getNodeStyle = () => {
    let baseClasses = "rounded-xl px-4 py-3 text-sm shadow-lg border-2 transition-all duration-300 font-medium text-center";

    if (selected) {
      baseClasses += " ring-4 ring-blue-400 ring-opacity-50";
    }

    return baseClasses;
  };

  // Get inline styles for consistent happy path highlighting
  const getInlineStyles = () => {
    const baseStyle = {
      borderRadius: '12px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      width: calculatedWidth ? `${calculatedWidth}px` : '120px',
      minWidth: '120px',
      padding: '12px 16px'
    };

    // Happy Path highlighting - takes priority
    if (showHappyPath && isHappyPath) {
      return {
        ...baseStyle,
        backgroundColor: '#dcfce7', // green-100
        borderColor: '#4ade80',     // green-400
        color: '#166534'           // green-800
      };
    }

    // Terminal/disabled state
    if (isEnd) {
      return {
        ...baseStyle,
        backgroundColor: '#f3f4f6', // gray-100
        borderColor: '#d1d5db',     // gray-300
        color: '#4b5563'           // gray-600
      };
    }

    // Normal state - modern blue theme
    return {
      ...baseStyle,
      backgroundColor: '#eff6ff', // blue-50
      borderColor: '#93c5fd',     // blue-300
      color: '#1e3a8a',          // blue-900
      border: '2px solid #9ca3af'
    };
  };

  // Format label for display
  const formatLabel = (text: string) => {
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format time for display
  const formatTime = (hours: number) => {
    if (hours < 1) return `${(hours * 60).toFixed(0)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  // Calculate estimated total process time for final nodes
  const estimatedTotalTime = isFinalNode ? count * 0.1 : 0; // Simple estimate

  return (
    <div
      className={getNodeStyle()}
      style={getInlineStyles()}
    >
      {/* Input handles (except for start nodes) */}
      {!isStart && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
        </>
      )}

      {/* Output handles (except for end nodes) */}
      {!isEnd && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            style={{
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
        </>
      )}

      {/* Node content */}
      <div className="text-center">
        <div className="font-semibold leading-tight mb-2 text-gray-800">
          {formatLabel(label)}
        </div>
        <div className="text-sm text-gray-600 font-mono bg-white/80 px-2 py-1 rounded">
          {count.toLocaleString()}
        </div>
      </div>

      {/* Total time label for final nodes */}
      {isFinalNode && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            backgroundColor: 'white',
            padding: '4px 12px',
            borderRadius: '3px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          Mean time: {formatTime(estimatedTotalTime)}
        </div>
      )}
    </div>
  );
};