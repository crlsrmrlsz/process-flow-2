import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isVisible,
  position,
  items,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose]);

  // Adjust position to keep menu within viewport
  const adjustedPosition = React.useMemo(() => {
    if (!isVisible || !menuRef.current) return position;

    const rect = menuRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 10;
    }

    // Adjust vertical position
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 10;
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position, isVisible]);

  const handleItemClick = (item: ContextMenuItem, event: React.MouseEvent) => {
    event.stopPropagation();

    if (item.disabled) return;

    if (item.onClick) {
      item.onClick();
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[220px] rounded-sm border border-zinc-200 bg-white/98 shadow-sm p-1 text-xs text-zinc-800"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {items.map((item) => (
        <div key={item.id}>
          <button
            className={`w-full text-left px-2 py-1 rounded-sm transition-colors flex items-center justify-between ${
              item.disabled
                ? 'text-zinc-400 cursor-not-allowed'
                : 'text-zinc-800 cursor-pointer hover:bg-zinc-100'
            }`}
            onClick={(e) => handleItemClick(item, e)}
            disabled={item.disabled}
          >
            <div className="flex items-center">
              {item.icon && (
                <span className="mr-2 text-sm">{item.icon}</span>
              )}
              <span>{item.label}</span>
            </div>
            {item.submenu && (
              <span className="text-zinc-400 ml-2">›</span>
            )}
          </button>

          {/* Submenu support */}
          {item.submenu && (
            <div className="absolute left-[calc(100%+4px)] top-0 min-w-[200px] rounded-sm border border-zinc-200 bg-white/98 shadow-sm p-1 text-xs">
              {item.submenu.map((subItem) => (
                <button
                  key={subItem.id}
                  className={`w-full text-left px-2 py-1 rounded-sm transition-colors flex items-center ${
                    subItem.disabled
                      ? 'text-zinc-400 cursor-not-allowed'
                      : 'text-zinc-700 cursor-pointer hover:bg-zinc-100'
                  }`}
                  onClick={(e) => handleItemClick(subItem, e)}
                  disabled={subItem.disabled}
                >
                  {subItem.icon && (
                    <span className="mr-2 text-sm">{subItem.icon}</span>
                  )}
                  <span>{subItem.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};