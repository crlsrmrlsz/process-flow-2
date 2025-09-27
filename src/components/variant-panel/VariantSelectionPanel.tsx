import React from 'react';
import type { Variant } from '../../types/Variant';
import { VARIANT_DEFINITIONS } from '../../constants/permitStates';

interface VariantSelectionPanelProps {
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
  showHappyPath: boolean;
  onHappyPathToggle: (enabled: boolean) => void;
  showBottlenecks: boolean;
  onBottlenecksToggle: (enabled: boolean) => void;
  onResetLayout: () => void;
}

export const VariantSelectionPanel: React.FC<VariantSelectionPanelProps> = ({
  variants,
  selectedVariants,
  onVariantSelect,
  showHappyPath,
  onHappyPathToggle,
  showBottlenecks,
  onBottlenecksToggle,
  onResetLayout
}) => {

  console.log('VariantSelectionPanel: variants.length =', variants.length);

  // Sort variants by case count (most common first)
  const sortedVariants = [...variants].sort((a, b) => b.case_count - a.case_count);
  const totalCases = variants.reduce((sum, v) => sum + v.case_count, 0);

  const getVariantDisplayName = (variantId: string) => {
    const definition = Object.values(VARIANT_DEFINITIONS).find(def =>
      def.name.toLowerCase().replace(/\s+/g, '_') === variantId
    );
    return definition?.name || variantId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Show loading state if no variants
  if (variants.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-base-content">Process Variants</h2>
        <div className="text-sm text-base-content/60 text-center py-8">
          Loading variants...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variants Header */}
      <div>
        <h2 className="text-sm font-medium text-base-content mb-3">
          Process Variants ({variants.length})
        </h2>

        {/* Variant List */}
        <div className="space-y-2">
          {sortedVariants.map((variant) => {
            const isSelected = selectedVariants.includes(variant.variant_id);
            const percentage = ((variant.case_count / totalCases) * 100).toFixed(1);
            const displayName = getVariantDisplayName(variant.variant_id);

            return (
              <label key={variant.variant_id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={isSelected}
                  onChange={() => onVariantSelect(variant.variant_id)}
                  aria-label={`Toggle variant ${displayName}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-base-content/60 min-w-[35px]">
                      {percentage}%
                    </span>
                    <span className="text-sm font-medium text-base-content truncate">
                      {displayName}
                    </span>
                  </div>
                  <div className="text-xs text-base-content/60">
                    {variant.case_count.toLocaleString()} cases
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="divider my-4"></div>

      {/* Controls Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-base-content">Display Options</h3>

        {/* Happy Path Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={showHappyPath}
            onChange={(e) => onHappyPathToggle(e.target.checked)}
            aria-label="Toggle happy path display"
          />
          <span className="text-sm text-base-content">Happy Path</span>
        </label>

        {/* Bottlenecks Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={showBottlenecks}
            onChange={(e) => onBottlenecksToggle(e.target.checked)}
            aria-label="Toggle bottlenecks display"
          />
          <span className="text-sm text-base-content">Bottlenecks</span>
        </label>
      </div>

      {/* Reset Layout Button */}
      <button
        className="btn btn-outline w-full mt-4"
        onClick={onResetLayout}
        aria-label="Reset layout"
      >
        Reset Layout
      </button>
    </div>
  );
};