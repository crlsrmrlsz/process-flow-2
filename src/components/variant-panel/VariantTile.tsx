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

  // Get color scheme based on variant type
  const getColorScheme = () => {
    if (variant.variant_id.includes('happy')) return 'border-green-200 bg-green-50 hover:bg-green-100';
    if (variant.variant_id.includes('info')) return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
    if (variant.variant_id.includes('rejected')) return 'border-red-200 bg-red-50 hover:bg-red-100';
    if (variant.variant_id.includes('withdrawn')) return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
    return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
  };

  const percentage = ((variant.case_count / (variant.case_count + 100)) * 100).toFixed(1); // Approximate for display

  return (
    <button
      onClick={onSelect}
      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-100 shadow-md ring-2 ring-blue-200'
          : `${getColorScheme()} shadow-sm hover:shadow-md`
      }`}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
            {getVariantName()}
          </h4>
          {isSelected && (
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </div>

        {/* Case count */}
        <div className="flex items-center justify-between text-xs">
          <span className={isSelected ? 'text-blue-700' : 'text-gray-600'}>
            {variant.case_count} cases
          </span>
          <span className={`font-mono ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
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
                  isSelected ? 'bg-blue-400' : 'bg-gray-400'
                }`}
              />
            ))}
            {variant.sequence.length > 6 && (
              <span className={`text-xs ml-1 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                +{variant.sequence.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Duration indicator */}
        <div className="text-center">
          <span className={`text-xs font-mono ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
            ~{variant.total_median_hours.toFixed(0)}h median
          </span>
        </div>
      </div>
    </button>
  );
};