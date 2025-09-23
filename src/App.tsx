import { useState, useMemo, useEffect } from 'react';
import type { EventLog } from './types/EventLog';
import type { Variant } from './types/Variant';
import { generateEventLog } from './utils/dataGenerator';
import { ProcessFlow } from './components/diagram/ProcessFlow';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { extractCases, extractVariants } from './utils/variantExtractor';
import { calculateTotalFlow, type TotalFlowData } from './utils/variantAggregator';
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
      {/* Main Container - Central panel with lateral spaces */}
      <div className="w-[60%] mx-auto">
        {/* Header Section */}
        <div className="w-full bg-white border-b border-gray-200 py-8">
          <div className="px-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Process Mining Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Visualize real building permit workflows from submission through inspection, review, and final approval.
              Explore different process variants to understand how applications flow through planning departments, safety reviews, and compliance checks.
              Use Happy Path to highlight optimal routes and Bottlenecks to identify delays in the approval process.
              Drag nodes to customize the layout and analyze process efficiency patterns.
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
                    totalFlowData={totalFlowData}
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
                    minWidth: '200px'
                  }}
                >
                  {/* Controls List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Happy Path Toggle */}
                    <div
                      onClick={() => setShowHappyPath(!showHappyPath)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: showHappyPath
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        fontWeight: '500',
                        minHeight: '40px',
                        boxShadow: showHappyPath
                          ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                          : '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transform: 'scale(1)',
                        border: showHappyPath ? 'none' : '1px solid #d1d5db'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = showHappyPath
                          ? '0 6px 16px rgba(16, 185, 129, 0.4)'
                          : '0 4px 8px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = showHappyPath
                          ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                          : '0 2px 4px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {/* Label */}
                      <div style={{
                        flex: 1,
                        fontWeight: '500',
                        color: showHappyPath ? 'white' : '#374151',
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
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: showBottlenecks
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        fontWeight: '500',
                        minHeight: '40px',
                        boxShadow: showBottlenecks
                          ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                          : '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transform: 'scale(1)',
                        border: showBottlenecks ? 'none' : '1px solid #d1d5db'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = showBottlenecks
                          ? '0 6px 16px rgba(239, 68, 68, 0.4)'
                          : '0 4px 8px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = showBottlenecks
                          ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                          : '0 2px 4px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {/* Label */}
                      <div style={{
                        flex: 1,
                        fontWeight: '500',
                        color: showBottlenecks ? 'white' : '#374151',
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
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        fontWeight: '500',
                        minHeight: '40px',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transform: 'scale(1)',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      {/* Label */}
                      <div style={{
                        flex: 1,
                        fontWeight: '500',
                        color: 'white',
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