import React from 'react';
import type { Variant } from '../../types/Variant';
import { VARIANT_DEFINITIONS } from '../../constants/permitStates';

interface VariantSelectionPanelProps {
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
  showHappyPath: boolean;
  onHappyPathToggle: (enabled: boolean) => void;
}

export const VariantSelectionPanel: React.FC<VariantSelectionPanelProps> = ({
  variants,
  selectedVariants,
  onVariantSelect
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
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: 'white',
          border: '2px solid #d1d5db',
          borderRadius: '12px',
          padding: '16px',
          minWidth: '300px',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
          Process Variants
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
          Loading variants...
        </div>
      </div>
    );
  }

  // Show variants panel
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        backgroundColor: 'white',
        border: '2px solid #d1d5db',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '360px',
        maxWidth: '500px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
      }}
    >
      {/* Header */}
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        Top Variants ({variants.length})
      </div>

      {/* Variant List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedVariants.map((variant, index) => {
          const isSelected = selectedVariants.includes(variant.variant_id);
          const percentage = ((variant.case_count / totalCases) * 100).toFixed(1);

          return (
            <div
              key={variant.variant_id}
              onClick={() => onVariantSelect(variant.variant_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '13px'
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                backgroundColor: isSelected ? '#3b82f6' : '#d1d5db',
                color: isSelected ? 'white' : '#374151'
              }}>
                {index + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '500',
                  color: isSelected ? '#1e40af' : '#374151',
                  marginBottom: '2px'
                }}>
                  {getVariantDisplayName(variant.variant_id)}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  {variant.case_count.toLocaleString()} cases
                </div>
              </div>
              <div style={{
                fontWeight: 'bold',
                color: isSelected ? '#1e40af' : '#374151'
              }}>
                {percentage}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};