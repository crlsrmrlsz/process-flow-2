import React from 'react';
import type { Variant } from '../../types/Variant';

interface FallbackDiagramProps {
  variant: Variant | null;
}

export const FallbackDiagram: React.FC<FallbackDiagramProps> = ({ variant }) => {
  if (!variant) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-medium mb-2">Select a Process Variant</h3>
          <p>Choose a variant from the left panel to visualize its process flow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{variant.variant_id}</h3>
        <p className="text-sm text-gray-600">{variant.case_count} cases</p>
      </div>

      {/* Simple text-based process flow */}
      <div className="space-y-4">
        <h4 className="font-medium">Process Flow:</h4>
        <div className="flex flex-wrap items-center gap-2">
          {variant.sequence.map((state, index) => (
            <React.Fragment key={state}>
              <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">
                {state.replace(/_/g, ' ')}
              </div>
              {index < variant.sequence.length - 1 && (
                <div className="text-gray-400">→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-6">
          <h4 className="font-medium mb-2">Transitions:</h4>
          <div className="space-y-2">
            {variant.transitions.map((transition, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm">
                  {transition.from.replace(/_/g, ' ')} → {transition.to.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <span>Cases: {transition.count}</span>
                  <span>Time: {transition.median_time_hours.toFixed(1)}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};