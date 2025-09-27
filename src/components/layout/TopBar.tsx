import React from 'react';

interface TopBarProps {
  mobileOpen: boolean;
  onMobileToggle: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mobileOpen,
  onMobileToggle,
  onZoomIn,
  onZoomOut,
  onFit
}) => {
  return (
    <header className="h-14 bg-base-200 border-b border-base-300 flex items-center justify-between px-4">
      {/* Left: Hamburger menu (mobile only) */}
      <div className="flex items-center">
        <button
          className="btn btn-ghost btn-square lg:hidden"
          aria-controls="mobile-controls"
          aria-expanded={mobileOpen}
          aria-label="Open controls"
          onClick={onMobileToggle}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Center: App title */}
      <div className="flex-1 flex justify-center lg:justify-start lg:ml-4">
        <h1 className="text-lg font-semibold text-base-content">
          Process Mining Demo
        </h1>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {onZoomIn && (
          <button
            className="btn btn-sm btn-ghost"
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
            className="btn btn-sm btn-ghost"
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
            className="btn btn-sm btn-ghost"
            onClick={onFit}
            aria-label="Fit view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};