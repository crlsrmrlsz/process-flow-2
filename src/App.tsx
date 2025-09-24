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
            <div className="text-base text-gray-600 max-w-3xl mx-auto leading-normal space-y-3">
              <p>
                Explore restaurant permit applications from submission through health inspection to final approval. Applications flow through intake validation, reviewer assignment, detailed review, and may loop back for additional information before proceeding to health inspection and final decision.
              </p>
              <p>
                Visualize workflow patterns, select variants to see unique paths, and analyze efficiency. Use 'Happy Path' for optimal routes (green) and 'Bottlenecks' for delays (red).
              </p>
            </div>
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
                    minWidth: '180px'
                  }}
                >
                  {/* Controls List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Happy Path Toggle */}
                    <button
                      onClick={() => setShowHappyPath(!showHappyPath)}
                      className={`github-btn ${showHappyPath ? 'active-green' : ''}`}
                      style={{ width: '100%' }}
                    >
                      Show Happy Path
                    </button>

                    {/* Show Bottlenecks Toggle */}
                    <button
                      onClick={() => setShowBottlenecks(!showBottlenecks)}
                      className={`github-btn ${showBottlenecks ? 'active-red' : ''}`}
                      style={{ width: '100%' }}
                    >
                      Show Bottlenecks
                    </button>

                    {/* Reset Layout Button */}
                    <button
                      onClick={handleResetLayout}
                      className="github-btn"
                      style={{ width: '100%' }}
                    >
                      Reset Layout
                    </button>
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

                  {/* Variant List - Checkbox Design */}
                  <div className="variant-form">
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