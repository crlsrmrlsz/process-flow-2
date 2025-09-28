import React from 'react';
import type { Variant } from '../../types/Variant';
import { VARIANT_DEFINITIONS } from '../../constants/permitStates';

interface VariantTileProps {
  variant: Variant;
  isSelected: boolean;
  onSelect: () => void;
}

export const VariantTile: React.FC<VariantTileProps> = ({ variant, isSelected, onSelect }) => {
  // Get display name from variant definitions
  const getVariantName = () => {
    const knownVariant = Object.entries(VARIANT_DEFINITIONS).find(([key]) => key === variant.variant_id);
    return knownVariant ? knownVariant[1].name : variant.variant_id.replace(/_/g, ' ');
  };

  // Generate mini sparkline for variant thumbnail
  const generateSparkline = () => {
    const sequence = variant.sequence;
    const width = 80;
    const height = 20;
    const stepWidth = width / Math.max(sequence.length - 1, 1);

    const pathData = sequence
      .map((_, index) => {
        const x = index * stepWidth;
        const y = height / 2 + (Math.sin(index * 0.8) * 3); // Add slight variation
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="opacity-60">
        <path
          d={pathData}
          stroke={isSelected ? '#3B82F6' : '#6B7280'}
          strokeWidth="2"
          fill="none"
          className="transition-colors"
        />
        {sequence.map((_, index) => (
          <circle
            key={index}
            cx={index * stepWidth}
            cy={height / 2 + (Math.sin(index * 0.8) * 3)}
            r="2"
            fill={isSelected ? '#3B82F6' : '#6B7280'}
            className="transition-colors"
          />
        ))}
      </svg>
    );
  };

  // Get DaisyUI card variant based on variant type
  const getCardVariant = () => {
    if (variant.variant_id.includes('happy')) return 'card-success';
    if (variant.variant_id.includes('info')) return 'card-info';
    if (variant.variant_id.includes('rejected')) return 'card-error';
    if (variant.variant_id.includes('withdrawn')) return 'card-warning';
    return '';
  };

  const percentage = ((variant.case_count / (variant.case_count + 100)) * 100).toFixed(1); // Approximate for display

  return (
    <button
      onClick={onSelect}
      className={`card w-full text-left transition-all hover:shadow-lg ${
        isSelected
          ? 'card-bordered border-primary bg-primary/10 shadow-lg'
          : `card-bordered bg-base-100 hover:bg-base-200 shadow-md ${getCardVariant()}`
      }`}
    >
      <div className="card-body p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className={`card-title text-sm ${isSelected ? 'text-primary' : 'text-base-content'}`}>
            {getVariantName()}
          </h4>
          {isSelected && (
            <div className="badge badge-primary badge-sm"></div>
          )}
        </div>

        {/* Case count */}
        <div className="flex items-center justify-between text-xs">
          <span className={isSelected ? 'text-primary' : 'text-base-content/70'}>
            {variant.case_count} cases
          </span>
          <span className={`font-mono ${isSelected ? 'text-primary' : 'text-base-content/70'}`}>
            {percentage}%
          </span>
        </div>

        {/* Mini sparkline */}
        <div className="flex justify-center">
          {generateSparkline()}
        </div>

        {/* Path length indicator */}
        <div className="flex items-center justify-center">
          <div className={`flex space-x-0.5 ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
            {variant.sequence.slice(0, 6).map((_, index) => (
              <div
                key={index}
                className={`w-1 h-1 rounded-full ${
                  isSelected ? 'bg-primary' : 'bg-base-content/40'
                }`}
              />
            ))}
            {variant.sequence.length > 6 && (
              <span className={`text-xs ml-1 ${isSelected ? 'text-primary' : 'text-base-content/60'}`}>
                +{variant.sequence.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Duration indicator */}
        <div className="text-center">
          <span className={`text-xs font-mono ${isSelected ? 'text-primary' : 'text-base-content/60'}`}>
            ~{variant.total_median_hours.toFixed(0)}h median
          </span>
        </div>
      </div>
    </button>
  );
};