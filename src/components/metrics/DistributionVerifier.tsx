import React from 'react';
import type { Variant } from '../../types/Variant';
import { VARIANT_DEFINITIONS } from '../../constants/permitStates';

interface DistributionVerifierProps {
  variants: Variant[];
  totalCases: number;
}

export const DistributionVerifier: React.FC<DistributionVerifierProps> = ({ variants, totalCases }) => {
  const getExpectedDistribution = () => {
    return Object.entries(VARIANT_DEFINITIONS).map(([key, def]) => ({
      variant_id: key,
      name: def.name,
      expected_percentage: def.probability * 100,
      expected_count: Math.round(totalCases * def.probability)
    }));
  };

  const getActualDistribution = () => {
    return variants.map(variant => {
      const knownVariant = Object.entries(VARIANT_DEFINITIONS).find(([key]) => key === variant.variant_id);
      return {
        variant_id: variant.variant_id,
        name: knownVariant ? knownVariant[1].name : 'Unknown Variant',
        actual_count: variant.case_count,
        actual_percentage: (variant.case_count / totalCases) * 100
      };
    });
  };

  const expected = getExpectedDistribution();
  const actual = getActualDistribution();

  const tolerance = 5; // ±5% tolerance

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Distribution Verification</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Expected Distribution</h4>
            <div className="space-y-2">
              {expected.map(item => (
                <div key={item.variant_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-mono">{item.expected_percentage.toFixed(1)}% ({item.expected_count})</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Actual Distribution</h4>
            <div className="space-y-2">
              {actual.map(item => {
                const expectedItem = expected.find(e => e.variant_id === item.variant_id);
                const isWithinTolerance = expectedItem ?
                  Math.abs(item.actual_percentage - expectedItem.expected_percentage) <= tolerance : false;

                return (
                  <div key={item.variant_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{item.actual_percentage.toFixed(1)}% ({item.actual_count})</span>
                      {expectedItem && (
                        <span className={`text-xs ${isWithinTolerance ? 'text-green-600' : 'text-red-600'}`}>
                          {isWithinTolerance ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Verification Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-lg font-semibold text-blue-900">{totalCases}</div>
              <div className="text-sm text-blue-700">Total Cases</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-lg font-semibold text-green-900">{variants.length}</div>
              <div className="text-sm text-green-700">Variants Found</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-lg font-semibold text-purple-900">
                {Math.round((variants.reduce((sum, v) => sum + v.case_count, 0) / totalCases) * 100)}%
              </div>
              <div className="text-sm text-purple-700">Coverage</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>✓ = Within {tolerance}% tolerance of expected distribution</p>
          <p>✗ = Outside tolerance range</p>
        </div>
      </div>
    </div>
  );
};