import React from 'react';

export interface WorkerInfoPanelProps {
  workerId: string;
  processCount: number;
  meanTime: number;
  isOverExpected: boolean;
  position: { x: number; y: number };
}

// Convert worker ID to display name
const getWorkerDisplayName = (workerId: string): string => {
  if (workerId.startsWith('clerk_')) {
    const num = parseInt(workerId.replace('clerk_', ''));
    return `Clerk ${String.fromCharCode(64 + num)}`; // A, B, C...
  }
  if (workerId.startsWith('reviewer_')) {
    const num = parseInt(workerId.replace('reviewer_', ''));
    return `Reviewer ${String.fromCharCode(64 + num)}`; // A, B, C...
  }
  if (workerId.startsWith('inspector_')) {
    const num = parseInt(workerId.replace('inspector_', ''));
    return `Inspector ${String.fromCharCode(64 + num)}`; // A, B, C...
  }
  return workerId; // fallback
};

// Format time like the edge labels
const formatTime = (hours: number): string => {
  if (hours < 1) return `${(hours * 60).toFixed(0)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

export const WorkerInfoPanel: React.FC<WorkerInfoPanelProps> = ({
  workerId,
  processCount,
  meanTime,
  isOverExpected,
  position
}) => {
  const workerName = getWorkerDisplayName(workerId);
  const borderColor = isOverExpected ? '#ef4444' : '#22c55e'; // Red for over, green for under

  return (
    <div
      className="absolute bg-white border rounded-md shadow-md text-xs z-20 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        borderLeftWidth: '3px',
        borderLeftColor: borderColor,
        minWidth: '120px'
      }}
    >
      <div className="p-2">
        <div className="font-semibold text-gray-800 mb-1">
          {workerName}
        </div>
        <div className="text-gray-600 space-y-0.5">
          <div>{processCount} processes</div>
          <div>{formatTime(meanTime)} avg</div>
        </div>
      </div>
    </div>
  );
};