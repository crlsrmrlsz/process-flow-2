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

  if (!isOpen) return null;

  return (
    <div className={`drawer lg:hidden ${isOpen ? 'drawer-open' : ''}`}>
      <input
        id="mobile-drawer-toggle"
        type="checkbox"
        className="drawer-toggle"
        checked={isOpen}
        onChange={() => {}} // Controlled by parent
      />

      <div className="drawer-content">
        {/* Empty - content is in main app */}
      </div>

      <div className="drawer-side">
        <label
          className="drawer-overlay"
          onClick={onClose}
          aria-hidden="true"
        ></label>

        <div
          id="mobile-controls"
          ref={drawerRef}
          className="bg-base-100 rounded-t-lg shadow-lg max-h-[85vh] overflow-auto w-full transform transition-transform duration-300"
          style={{
            transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50
          }}
          aria-hidden={!isOpen}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
        >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b bg-base-200 rounded-t-lg">
          <h2 id="drawer-title" className="text-lg font-semibold text-base-content">
            Process Controls
          </h2>
          <button
            ref={firstElementRef}
            className="btn btn-ghost btn-square btn-sm"
            onClick={onClose}
            aria-label="Close controls"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
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

          {/* Pull indicator */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-1 bg-base-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};