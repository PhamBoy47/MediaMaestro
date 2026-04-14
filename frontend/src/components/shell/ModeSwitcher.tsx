import React from 'react';
import { useUIStore } from '../../stores/ui-store';
import { cn } from '../../lib/utils';

export const ModeSwitcher: React.FC = () => {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const modes = [
    { id: 'library', label: 'Library' },
    { id: 'video', label: 'Videos' },
    { id: 'music', label: 'Music' }
  ] as const;

  return (
    <div className="flex flex-col gap-1 p-3 border-b border-surface-3">
      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 px-2">Navigation</span>
      <div className="flex flex-col gap-1">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm transition-all duration-200",
              viewMode === mode.id 
                ? "bg-accent text-white shadow-md shadow-accent/20" 
                : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};
