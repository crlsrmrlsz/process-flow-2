import React, { useEffect, useRef } from 'react';
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstElementRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus management
      if (firstElementRef.current) {
        firstElementRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    drawer.addEventListener('keydown', handleTabKey);
    return () => drawer.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  return (
    <div className="drawer lg:hidden">
      {/* Hidden checkbox for drawer state - controlled by parent */}
      <input
        id="mobile-drawer-toggle"
        type="checkbox"
        className="drawer-toggle"
        checked={isOpen}
        readOnly
      />

      {/* Drawer content (empty - main content is in parent) */}
      <div className="drawer-content">
        {/* Empty - this drawer is an overlay */}
      </div>

      {/* Drawer side panel */}
      <div className="drawer-side z-50">
        {/* Transparent backdrop overlay - maintains click-to-close without shading */}
        <label
          htmlFor="mobile-drawer-toggle"
          className="drawer-overlay bg-transparent"
          onClick={onClose}
          aria-label="Close drawer"
        ></label>

        {/* Drawer panel - using DaisyUI menu structure */}
        <ul
          id="mobile-controls"
          ref={drawerRef}
          className="menu bg-base-200 text-base-content min-h-full w-96 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
          {/* Drawer Header */}
          <li>
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 id="drawer-title" className="text-base font-semibold text-base-content">
                Process Controls
              </h2>
              <button
                ref={firstElementRef}
                className="btn btn-ghost btn-square btn-sm"
                onClick={onClose}
                aria-label="Collapse drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </li>

          {/* Drawer Content */}
          <li>
            <div>
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
          </li>
        </ul>
      </div>
    </div>
  );
};