import React from 'react';
import { ProcessFlow } from '../diagram/ProcessFlow';
import { ErrorBoundary } from './ErrorBoundary';
import type { Variant } from '../../types/Variant';

interface CanvasHostProps {
  variant: Variant[];
  bottlenecks: any[];
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
  showHappyPath: boolean;
  showBottlenecks: boolean;
  resetLayoutTrigger: number;
  totalFlowData: any;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
  showFloatingToolbar?: boolean;
}

export const CanvasHost: React.FC<CanvasHostProps> = ({
  variant,
  bottlenecks,
  variants,
  selectedVariants,
  onVariantSelect,
  showHappyPath,
  showBottlenecks,
  resetLayoutTrigger,
  totalFlowData,
  onZoomIn,
  onZoomOut,
  onFit,
  showFloatingToolbar = false
}) => {
  return (
    <main id="canvasHost" className="flex-1 relative bg-base-100">
      {/* Main diagram container */}
      <div id="diagramContainer" className="w-full h-full p-4 md:p-6">
        <ErrorBoundary>
          <ProcessFlow
            variant={variant}
            bottlenecks={bottlenecks}
            variants={variants}
            selectedVariants={selectedVariants}
            onVariantSelect={onVariantSelect}
            showHappyPath={showHappyPath}
            showBottlenecks={showBottlenecks}
            resetLayoutTrigger={resetLayoutTrigger}
            totalFlowData={totalFlowData}
          />
        </ErrorBoundary>
      </div>

      {/* Optional floating toolbar */}
      {showFloatingToolbar && (onZoomIn || onZoomOut || onFit) && (
        <div className="absolute right-4 top-24 flex flex-col gap-2 z-50">
          {onZoomIn && (
            <button
              className="btn btn-square btn-sm shadow-lg"
              onClick={onZoomIn}
              aria-label="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
          {onZoomOut && (
            <button
              className="btn btn-square btn-sm shadow-lg"
              onClick={onZoomOut}
              aria-label="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
              </svg>
            </button>
          )}
          {onFit && (
            <button
              className="btn btn-square btn-sm shadow-lg"
              onClick={onFit}
              aria-label="Fit view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
      )}
    </main>
  );
};