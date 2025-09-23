import { useState, useMemo, useEffect } from 'react';
import type { EventLog } from './types/EventLog';
import type { Variant } from './types/Variant';
import { generateEventLog } from './utils/dataGenerator';
import { ProcessFlow } from './components/diagram/ProcessFlow';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { extractCases, extractVariants } from './utils/variantExtractor';
import { identifyBottlenecks } from './utils/metricsCalculator';

function App() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [showHappyPath, setShowHappyPath] = useState(false);
  const [showBottlenecks, setShowBottlenecks] = useState(false);
  const [resetLayoutTrigger, setResetLayoutTrigger] = useState(0);

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
      {/* Main Container - Central panel with lateral spaces */}
      <div className="w-[70%] mx-auto">
        {/* Header Section */}
        <div className="w-full bg-white border-b border-gray-200 py-8">
          <div className="px-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Process Mining Demo
            </h1>
            <p className="text-lg text-gray-600">
              Interactive analysis of permit application process variants and optimal flows
            </p>
          </div>
        </div>

        {/* Main Content Section - Full Width Diagram with Floating Controls */}
        <div className="w-full bg-gray-50 pt-0 pb-8">
          <div className="px-8">
            {/* Main Container with Relative Positioning for Overlays */}
            <div className="relative">
              {/* Full Width Diagram - Background Layer */}
              <div className="relative h-[92vh] bg-white rounded-lg shadow-sm overflow-hidden" style={{ zIndex: 1 }}>
                <ErrorBoundary>
                  <ProcessFlow
                    variant={selectedVariantData}
                    bottlenecks={bottlenecks}
                    variants={variants}
                    selectedVariants={selectedVariants}
                    onVariantSelect={handleVariantSelect}
                    showHappyPath={showHappyPath}
                    showBottlenecks={showBottlenecks}
                    onResetLayout={handleResetLayout}
                    resetLayoutTrigger={resetLayoutTrigger}
                  />
                </ErrorBoundary>
              </div>

              {/* Controls Panel - Top Left Overlay */}
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
                    minWidth: '180px'
                  }}
                >
                  {/* Controls List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {/* Happy Path Toggle */}
                    <div
                      onClick={() => setShowHappyPath(!showHappyPath)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: showHappyPath ? '#eff6ff' : '#e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '16px',
                        minHeight: '20px'
                      }}
                    >
                      {/* Label */}
                      <div style={{
                        flex: 1,
                        fontWeight: '500',
                        color: showHappyPath ? '#1e40af' : '#374151',
                        textAlign: 'center'
                      }}>
                        Show Happy Path
                      </div>
                    </div>

                    {/* Show Bottlenecks Toggle */}
                    <div
                      onClick={() => setShowBottlenecks(!showBottlenecks)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: showBottlenecks ? '#fef2f2' : '#e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '16px',
                        minHeight: '20px'
                      }}
                    >
                      {/* Label */}
                      <div style={{
                        flex: 1,
                        fontWeight: '500',
                        color: showBottlenecks ? '#dc2626' : '#374151',
                        textAlign: 'center'
                      }}>
                        Show Bottlenecks
                      </div>
                    </div>

                    {/* Reset Layout Button */}
                    <div
                      onClick={handleResetLayout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '16px',
                        minHeight: '20px'
                      }}
                    >
                      {/* Label */}
                      <div style={{
                        flex: 1,
                        fontWeight: '500',
                        color: '#374151',
                        textAlign: 'center'
                      }}>
                        Reset Layout
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Variants Panel - Top Right Overlay */}
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
                  {/* Header */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#374151',
                    marginBottom: '12px'
                  }}>
                    Process Variants ({variants.length})
                  </div>

                  {/* Variant List - Minimal Design */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {variants.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>
                        Loading variants...
                      </div>
                    ) : (
                      variants.sort((a, b) => b.case_count - a.case_count).map((variant, index) => {
                        const isSelected = selectedVariants.includes(variant.variant_id);
                        const totalCases = variants.reduce((sum, v) => sum + v.case_count, 0);
                        const percentage = ((variant.case_count / totalCases) * 100).toFixed(1);
                        const displayName = variant.variant_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                        return (
                          <div
                            key={variant.variant_id}
                            onClick={() => handleVariantSelect(variant.variant_id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? '#eff6ff' : '#e5e7eb',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '16px',
                              minHeight: '20px'
                            }}
                          >
                            {/* Number */}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '18px',
                              height: '18px',
                              borderRadius: '2px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: isSelected ? '#3b82f6' : '#d1d5db',
                              color: isSelected ? 'white' : '#374151',
                              flexShrink: 0
                            }}>
                              {index + 1}
                            </span>

                            {/* Name */}
                            <div style={{
                              flex: 1,
                              fontWeight: '500',
                              color: isSelected ? '#1e40af' : '#374151',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {displayName}
                            </div>

                            {/* Percentage */}
                            <div style={{
                              fontWeight: 'bold',
                              color: isSelected ? '#1e40af' : '#374151',
                              flexShrink: 0,
                              minWidth: '30px',
                              textAlign: 'right'
                            }}>
                              {percentage}%
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;