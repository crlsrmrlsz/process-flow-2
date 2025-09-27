import React from 'react';
import { VariantSelectionPanel } from '../variant-panel/VariantSelectionPanel';
import type { Variant } from '../../types/Variant';

interface LeftSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
  showHappyPath: boolean;
  onHappyPathToggle: (enabled: boolean) => void;
  showBottlenecks: boolean;
  onBottlenecksToggle: (enabled: boolean) => void;
  onResetLayout: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  collapsed,
  onToggleCollapse,
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
    <div className="drawer-side">
      <label htmlFor="drawer-toggle" className="drawer-overlay"></label>
      <aside className={`flex flex-col border-r bg-base-100 overflow-hidden min-h-full ${
        collapsed ? 'w-16' : 'w-72'
      }`}>
      {/* Sidebar Header with Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b bg-base-200">
        {!collapsed && (
          <h2 className="text-sm font-medium text-base-content">Controls</h2>
        )}
        <button
          className="btn btn-ghost btn-square btn-sm"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-auto">
        {collapsed ? (
          /* Collapsed state - show minimal icons with tooltips */
          <div className="p-2 space-y-2">
            <div className="tooltip tooltip-right" data-tip="Reset Layout">
              <button
                className="btn btn-ghost btn-square w-full"
                onClick={onResetLayout}
                aria-label="Reset layout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="tooltip tooltip-right" data-tip="Happy Path">
              <button
                className={`btn btn-ghost btn-square w-full ${showHappyPath ? 'bg-success text-success-content' : ''}`}
                onClick={() => onHappyPathToggle(!showHappyPath)}
                aria-label="Toggle happy path"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            <div className="tooltip tooltip-right" data-tip="Bottlenecks">
              <button
                className={`btn btn-ghost btn-square w-full ${showBottlenecks ? 'bg-error text-error-content' : ''}`}
                onClick={() => onBottlenecksToggle(!showBottlenecks)}
                aria-label="Toggle bottlenecks"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Expanded state - show full VariantSelectionPanel */
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
        )}
      </div>
      </aside>
    </div>
  );
};