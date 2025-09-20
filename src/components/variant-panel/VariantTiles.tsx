import React from 'react';
import type { Variant } from '../../types/Variant';
import { VariantTile } from './VariantTile';

interface VariantTilesProps {
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
}

export const VariantTiles: React.FC<VariantTilesProps> = ({
  variants,
  selectedVariants,
  onVariantSelect
}) => {
  if (variants.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Process Variants</h3>
        <div className="text-center text-gray-500 py-8">
          <p>No variants available</p>
          <p className="text-sm mt-1">Load event log data to see process variants</p>
        </div>
      </div>
    );
  }

  // Sort variants by case count (most common first)
  const sortedVariants = [...variants].sort((a, b) => b.case_count - a.case_count);

  const totalCases = variants.reduce((sum, v) => sum + v.case_count, 0);

  return (
    <div className="bg-white p-4 rounded-lg shadow" data-testid="variant-tiles">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Process Variants</h3>
        <div className="text-sm text-gray-500">
          {variants.length} variant{variants.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Multi-selection controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            // Select all variants
            variants.forEach(variant => {
              if (!selectedVariants.includes(variant.variant_id)) {
                onVariantSelect(variant.variant_id);
              }
            });
          }}
          className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
          disabled={selectedVariants.length === variants.length}
        >
          Select All ({variants.length})
        </button>
        <button
          onClick={() => {
            // Clear all selections
            selectedVariants.forEach(variantId => {
              onVariantSelect(variantId);
            });
          }}
          className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          disabled={selectedVariants.length === 0}
        >
          Clear All
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-gray-50 p-2 rounded text-center">
          <div className="font-semibold text-gray-900">{totalCases}</div>
          <div className="text-gray-600">Total Cases</div>
        </div>
        <div className="bg-blue-50 p-2 rounded text-center">
          <div className="font-semibold text-blue-900">
            {((sortedVariants[0]?.case_count || 0) / totalCases * 100).toFixed(0)}%
          </div>
          <div className="text-blue-700">Most Common</div>
        </div>
      </div>

      {/* Variant selection prompt */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Select variants</span> to visualize their combined process flow.
          Click multiple variants to compare paths.
        </p>
        {selectedVariants.length > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            Currently viewing: <span className="font-medium">{selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''}</span>
            {selectedVariants.length <= 2 && (
              <span> ({selectedVariants.join(', ')})</span>
            )}
          </p>
        )}
      </div>

      {/* Variant tiles grid */}
      <div className="grid grid-cols-1 gap-3">
        {sortedVariants.map((variant) => (
          <VariantTile
            key={variant.variant_id}
            variant={variant}
            isSelected={selectedVariants.includes(variant.variant_id)}
            onSelect={() => onVariantSelect(variant.variant_id)}
          />
        ))}
      </div>

      {/* Coverage information */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Coverage Analysis</h4>
        <div className="space-y-1">
          {sortedVariants.slice(0, 3).map((variant, index) => {
            const percentage = (variant.case_count / totalCases * 100).toFixed(1);
            return (
              <div key={variant.variant_id} className="flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  index === 0 ? 'bg-green-400' :
                  index === 1 ? 'bg-blue-400' :
                  'bg-yellow-400'
                }`} />
                <span className="flex-1 truncate">{variant.variant_id}</span>
                <span className="font-mono">{percentage}%</span>
              </div>
            );
          })}
          {variants.length > 3 && (
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full mr-2 bg-gray-300" />
              <span className="flex-1">Other variants</span>
              <span className="font-mono">
                {(sortedVariants.slice(3).reduce((sum, v) => sum + v.case_count, 0) / totalCases * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};