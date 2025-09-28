import { useState, useMemo, useEffect } from 'react';
import type { Variant } from './types/Variant';
import { generateEventLog } from './utils/dataGenerator';
import { extractCases, extractVariants } from './utils/variantExtractor';
import { calculateTotalFlow } from './utils/variantAggregator';
import { identifyBottlenecks } from './utils/metricsCalculator';
import { TopBar } from './components/layout/TopBar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { CanvasHost } from './components/layout/CanvasHost';

function App() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [showHappyPath, setShowHappyPath] = useState(false);
  const [showBottlenecks, setShowBottlenecks] = useState(false);
  const [resetLayoutTrigger, setResetLayoutTrigger] = useState(0);

  // Layout state
  const [mobileOpen, setMobileOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


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

  // Layout handlers
  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMobileClose = () => {
    setMobileOpen(false);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    // Trigger a resize after sidebar animation completes
    setTimeout(() => {
      setResetLayoutTrigger(prev => prev + 1);
    }, 300);
  };

  // Get selected variant objects
  const selectedVariantData = variants.filter(v => selectedVariants.includes(v.variant_id));


  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Top Bar */}
      <TopBar
        mobileOpen={mobileOpen}
        onMobileToggle={handleMobileToggle}
      />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <LeftSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
          variants={variants}
          selectedVariants={selectedVariants}
          onVariantSelect={handleVariantSelect}
          showHappyPath={showHappyPath}
          onHappyPathToggle={setShowHappyPath}
          showBottlenecks={showBottlenecks}
          onBottlenecksToggle={setShowBottlenecks}
          onResetLayout={handleResetLayout}
        />

        {/* Main Canvas */}
        <CanvasHost
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
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={handleMobileClose}
        variants={variants}
        selectedVariants={selectedVariants}
        onVariantSelect={handleVariantSelect}
        showHappyPath={showHappyPath}
        onHappyPathToggle={setShowHappyPath}
        showBottlenecks={showBottlenecks}
        onBottlenecksToggle={setShowBottlenecks}
        onResetLayout={handleResetLayout}
      />
    </div>
  );
}

export default App;