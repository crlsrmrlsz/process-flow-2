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
}

interface CustomNodeProps {
  data: CustomNodeData;
  selected: boolean;
}

export const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const { label, count, isBottleneck, isStart, isEnd, isHappyPath, showHappyPath } = data;

  // Get node styling based on design guide patterns - FORCE modern rounded style
  const getNodeStyle = () => {
    // Use !important-style approach with explicit rounded-xl and modern styling
    let baseClasses = "!rounded-xl px-4 py-3 text-sm !shadow-lg !border-2 transition-all duration-300 font-medium min-w-[120px] text-center";

    if (selected) {
      baseClasses += " !ring-4 !ring-blue-400 !ring-opacity-50";
    }

    // Happy Path highlighting - more prominent
    if (showHappyPath && isHappyPath) {
      return `${baseClasses} !bg-green-100 !border-green-400 !text-green-800 !shadow-green-200`;
    }

    // Terminal/disabled state
    if (isEnd) {
      return `${baseClasses} !bg-gray-100 !border-gray-300 !text-gray-600`;
    }

    // Normal state - modern blue theme
    return `${baseClasses} !bg-blue-50 !border-blue-300 !text-blue-900 !shadow-blue-100`;
  };

  // Format label for display
  const formatLabel = (text: string) => {
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div
      className={getNodeStyle()}
      style={{
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        border: '2px solid #e5e7eb',
        backgroundColor: showHappyPath && isHappyPath ? '#dcfce7' : isEnd ? '#dbeafe' : 'white',
        minWidth: '120px',
        padding: '12px 16px'
      }}
    >
      {/* Input handle (except for start nodes) */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-white border-2 border-gray-400"
          style={{
            top: -6,
            borderRadius: '50%'
          }}
        />
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

      {/* Output handle (except for end nodes) */}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-white border-2 border-gray-400"
          style={{
            bottom: -6,
            borderRadius: '50%'
          }}
        />
      )}
    </div>
  );
};