import React from 'react';
import { VariantSelectionPanel } from '../variant-panel/VariantSelectionPanel';
import type { Variant } from '../../types/Variant';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
  showHappyPath: boolean;
  onHappyPathToggle: (enabled: boolean) => void;
  showBottlenecks: boolean;
  onBottlenecksToggle: (enabled: boolean) => void;
  onResetLayout: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  variants,
  selectedVariants,
  onVariantSelect,
  showHappyPath,
  onHappyPathToggle,
  showBottlenecks,
  onBottlenecksToggle,
  onResetLayout
}) => {
  return (
    <div className="lg:hidden">
      {/* DaisyUI Drawer */}
      <div className="drawer drawer-end">
        <input
          id="mobile-drawer-toggle"
          type="checkbox"
          className="drawer-toggle"
          checked={isOpen}
          readOnly
        />

        {/* Drawer Content (Main Page Content) */}
        <div className="drawer-content">
          {/* Page content here - this will be handled by parent components */}
        </div>

        {/* Drawer Side */}
        <div className="drawer-side z-50">
          {/* Drawer overlay */}
          <label
            htmlFor="mobile-drawer-toggle"
            className="drawer-overlay"
            onClick={onClose}
            aria-label="Close drawer"
          ></label>

          {/* Drawer panel */}
          <aside className="min-h-full w-80 bg-base-100">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b bg-base-200">
              <h2 className="text-lg font-semibold text-base-content">
                Process Controls
              </h2>
              <button
                className="btn btn-ghost btn-square btn-sm"
                onClick={onClose}
                aria-label="Close controls"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer content */}
            <div className="p-4">
              <VariantSelectionPanel
                variants={variants}
                selectedVariants={selectedVariants}
                onVariantSelect={onVariantSelect}
                showHappyPath={showHappyPath}
                onHappyPathToggle={onHappyPathToggle}
                showBottlenecks={showBottlenecks}
                onBottlenecksToggle={onBottlenecksToggle}
                onResetLayout={onResetLayout}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};