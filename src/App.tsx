import { useState, useMemo, useEffect } from 'react';
import type { Variant } from './types/Variant';
import { generateEventLog } from './utils/dataGenerator';
import { ProcessFlow } from './components/diagram/ProcessFlow';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { extractCases, extractVariants } from './utils/variantExtractor';
import { calculateTotalFlow } from './utils/variantAggregator';
import { identifyBottlenecks } from './utils/metricsCalculator';
import { VARIANT_DEFINITIONS } from './constants/permitStates';

function App() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [showHappyPath, setShowHappyPath] = useState(false);
  const [showBottlenecks, setShowBottlenecks] = useState(false);
  const [resetLayoutTrigger, setResetLayoutTrigger] = useState(0);

  // Helper function to get proper variant display name
  const getVariantDisplayName = (variantId: string): string => {
    // Direct lookup in VARIANT_DEFINITIONS
    const variantKey = variantId as keyof typeof VARIANT_DEFINITIONS;
    if (VARIANT_DEFINITIONS[variantKey]) {
      return VARIANT_DEFINITIONS[variantKey].name;
    }

    // Fallback to formatted variant_id if not found in definitions
    return variantId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Fixed dataset - generated once on app load
  const eventLog = useMemo(() => {
    console.log('Generating fixed dataset with 3875 samples...');
    return generateEventLog({
      totalCases: 3875,
      seed: 42 // Fixed seed for reproducible results
    });
  }, []);

  // Extract variants from eventLog
  const extractedVariants = useMemo(() => {
    if (!eventLog) return [];

    try {
      const cases = extractCases(eventLog.events);
      console.log('Extracted', cases.length, 'cases');

      const variants = extractVariants(cases);
      console.log('Extracted', variants.length, 'variants:', variants.map(v => v.variant_id));

      return variants;
    } catch (error) {
      console.error('Error processing event log:', error);
      return [];
    }
  }, [eventLog]);

  // Calculate total flow data from ALL cases (for topology vs volume separation)
  const totalFlowData = useMemo(() => {
    if (!eventLog) return null;

    try {
      const cases = extractCases(eventLog.events);
      const flowData = calculateTotalFlow(cases);
      console.log('Calculated total flow data with', flowData.transitions.size, 'unique transitions');
      return flowData;
    } catch (error) {
      console.error('Error calculating total flow:', error);
      return null;
    }
  }, [eventLog]);

  // Update variants and auto-select when eventLog changes
  useEffect(() => {
    console.log('App: Setting variants, extractedVariants.length =', extractedVariants.length);
    setVariants(extractedVariants);

    // Auto-select first non-direct-approval variant if available
    if (extractedVariants.length > 0) {
      const nonDirectApprovalVariant = extractedVariants.find(v => v.variant_id !== 'direct_approval');
      if (nonDirectApprovalVariant) {
        console.log('Auto-selecting variant:', nonDirectApprovalVariant.variant_id);
        setSelectedVariants([nonDirectApprovalVariant.variant_id]);
      } else {
        console.log('No non-direct-approval variants found');
        setSelectedVariants([]);
      }
    } else {
      console.log('No variants found to auto-select');
      setSelectedVariants([]);
    }
  }, [extractedVariants]);

  // Compute bottlenecks only for diagram
  const bottlenecks = useMemo(() => {
    if (!eventLog || variants.length === 0) {
      return [];
    }
    return identifyBottlenecks(variants);
  }, [eventLog, variants]);


  const handleVariantSelect = (variantId: string) => {
    setSelectedVariants(prev => {
      if (prev.includes(variantId)) {
        // Deselect if already selected
        return prev.filter(id => id !== variantId);
      } else {
        // Add to selection
        return [...prev, variantId];
      }
    });
  };

  const handleResetLayout = () => {
    console.log('Layout reset triggered from parent');
    setResetLayoutTrigger(prev => prev + 1);
  };

  // Get selected variant objects
  const selectedVariantData = variants.filter(v => selectedVariants.includes(v.variant_id));


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Title with Subtitle */}
      <div className="w-full py-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Process Mining Demo
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Restaurant permit management, process flow extracted from raw log data.
          </p>
        </div>
      </div>

      {/* 70% Width Main Content - Centered Diagram with Overlapping Panels */}
      <div className="w-[70%] mx-auto bg-gray-50 pb-8">
        {/* Main Container with Relative Positioning for Overlays */}
        <div className="relative w-full">
          {/* Full Width Centered Diagram - Background Layer */}
          <div className="relative h-[85vh] bg-white rounded-lg shadow-sm overflow-hidden mx-8" style={{ zIndex: 1 }}>
            <ErrorBoundary>
              <ProcessFlow
                variant={selectedVariantData}
                bottlenecks={bottlenecks}
                variants={variants}
                selectedVariants={selectedVariants}
                onVariantSelect={handleVariantSelect}
                showHappyPath={showHappyPath}
                showBottlenecks={showBottlenecks}
                resetLayoutTrigger={resetLayoutTrigger}
                totalFlowData={totalFlowData}
              />
            </ErrorBoundary>
          </div>

          {/* Variants + Controls Panel - Top Left Overlay */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10
          }}>
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '12px',
                minWidth: '240px',
                maxWidth: '280px'
              }}
                >
                  {/* Variants Header */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#374151',
                    marginBottom: '12px'
                  }}>
                    Process Variants ({variants.length})
                  </div>

                  {/* Variant List - Checkbox Design */}
                  <div className="variant-form">
                    {variants.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>
                        Loading variants...
                      </div>
                    ) : (
                      variants.sort((a, b) => b.case_count - a.case_count).map((variant) => {
                        const isSelected = selectedVariants.includes(variant.variant_id);
                        const totalCases = variants.reduce((sum, v) => sum + v.case_count, 0);
                        const percentage = ((variant.case_count / totalCases) * 100).toFixed(1);
                        const displayName = getVariantDisplayName(variant.variant_id);

                        return (
                          <div key={variant.variant_id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleVariantSelect(variant.variant_id)}
                              />

                              {/* Percentage first */}
                              <div className="variant-percentage">
                                {percentage}%
                              </div>

                              {/* Name */}
                              <div className="variant-name">
                                {displayName}
                              </div>
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Horizontal Separator */}
                  <div style={{
                    borderTop: '1px solid #e5e7eb',
                    margin: '12px 0'
                  }}></div>

                  {/* Controls Section */}
                  <div className="variant-form">
                    {/* Happy Path Checkbox */}
                    <div>
                      <label>
                        <input
                          type="checkbox"
                          checked={showHappyPath}
                          onChange={() => setShowHappyPath(!showHappyPath)}
                        />
                        <div className="variant-name">
                          Happy Path
                        </div>
                      </label>
                    </div>

                    {/* Bottlenecks Checkbox */}
                    <div>
                      <label>
                        <input
                          type="checkbox"
                          checked={showBottlenecks}
                          onChange={() => setShowBottlenecks(!showBottlenecks)}
                        />
                        <div className="variant-name">
                          Bottlenecks
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Reset Layout Button */}
                  <button
                    onClick={handleResetLayout}
                    className="github-btn"
                    style={{
                      width: '100%',
                      marginTop: '8px'
                    }}
                  >
                    Reset Layout
                  </button>
            </div>
          </div>

          {/* How-to-Use Panel - Top Right */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10
          }}>
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '12px',
                    minWidth: '240px',
                    maxWidth: '280px'
                  }}
                >
                  {/* How to Use Description */}
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#374151',
                    lineHeight: '1.4',
                    textAlign: 'left'
                  }}>
                    <strong style={{ fontSize: '12px' }}>How to use:</strong> Select process variants from the left panel to compare different approval paths. Toggle 'Happy Path' to highlight the most efficient route in green, or enable 'Bottlenecks' to identify delays and inefficiencies in red. Drag nodes to customize the layout for better analysis. Each edge displays average processing time between steps.
                  </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;