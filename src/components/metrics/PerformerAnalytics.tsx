import React from 'react';
import type { ProcessMetrics } from '../../utils/metricsCalculator';

interface PerformerAnalyticsProps {
  metrics: ProcessMetrics;
}

export const PerformerAnalytics: React.FC<PerformerAnalyticsProps> = ({ metrics }) => {
  const { performerMetrics } = metrics;

  const sortedPerformers = Object.entries(performerMetrics.performerWorkload)
    .sort((a, b) => b[1].totalTransitions - a[1].totalTransitions);

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${(hours * 60).toFixed(0)}min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      return `${(hours / 24).toFixed(1)}d`;
    }
  };

  const getPerformanceLevel = (avgTime: number, allTimes: number[]) => {
    const sorted = [...allTimes].sort((a, b) => a - b);
    const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const p25 = sorted[Math.floor(sorted.length * 0.25)] || 0;

    if (avgTime <= p25) return { level: 'Excellent', color: 'text-green-700 bg-green-100' };
    if (avgTime <= p75) return { level: 'Good', color: 'text-blue-700 bg-blue-100' };
    return { level: 'Needs Attention', color: 'text-red-700 bg-red-100' };
  };

  const allAverageTimes = sortedPerformers.map(([, data]) => data.averageTime);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Performer Analytics</h3>

      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-gray-900">{performerMetrics.totalPerformers}</div>
            <div className="text-sm text-gray-600">Total Performers</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-2xl font-bold text-yellow-900">{performerMetrics.bottleneckPerformers.length}</div>
            <div className="text-sm text-yellow-700">Bottlenecks</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-900">
              {formatTime(allAverageTimes.reduce((sum, time) => sum + time, 0) / allAverageTimes.length || 0)}
            </div>
            <div className="text-sm text-blue-700">Avg Processing Time</div>
          </div>
        </div>

        {/* Bottleneck Performers Alert */}
        {performerMetrics.bottleneckPerformers.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Bottleneck Performers Detected</h4>
            <div className="flex flex-wrap gap-2">
              {performerMetrics.bottleneckPerformers.map(performer => (
                <span key={performer} className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm">
                  {performer}
                </span>
              ))}
            </div>
            <p className="text-sm text-red-700 mt-2">
              These performers have consistently higher processing times and may need support or training.
            </p>
          </div>
        )}

        {/* Performer Details */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Individual Performance</h4>
          <div className="space-y-3">
            {sortedPerformers.map(([performer, data]) => {
              const performance = getPerformanceLevel(data.averageTime, allAverageTimes);
              const isBottleneck = performerMetrics.bottleneckPerformers.includes(performer);

              return (
                <div key={performer} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{performer}</span>
                      {isBottleneck && <span className="text-red-500 text-sm">🚨 Bottleneck</span>}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${performance.color}`}>
                      {performance.level}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Workload:</span>
                      <span className="ml-1 font-medium">{data.totalTransitions} transitions</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Time:</span>
                      <span className="ml-1 font-medium">{formatTime(data.averageTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Activities:</span>
                      <span className="ml-1 font-medium">{data.activities.length}</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-gray-600 text-sm">Handles: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.activities.slice(0, 5).map(activity => (
                        <span key={activity} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {activity.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {data.activities.length > 5 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          +{data.activities.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Distribution */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Performance Distribution</h4>
          <div className="bg-gray-50 p-3 rounded">
            <div className="flex justify-between text-sm mb-2">
              <span>Fastest</span>
              <span>Average</span>
              <span>Slowest</span>
            </div>
            <div className="flex justify-between text-sm font-mono">
              <span className="text-green-600">{formatTime(Math.min(...allAverageTimes))}</span>
              <span className="text-blue-600">
                {formatTime(allAverageTimes.reduce((sum, time) => sum + time, 0) / allAverageTimes.length)}
              </span>
              <span className="text-red-600">{formatTime(Math.max(...allAverageTimes))}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-green-400 via-blue-400 to-red-400 h-2 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};