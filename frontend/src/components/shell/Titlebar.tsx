import React from 'react';
import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';

export const Titlebar: React.FC = () => {
  const viewMode = useUIStore((s) => s.viewMode);

  return (
    <div 
      style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
      className={cn(
        "h-10 flex items-center justify-between px-4 select-none z-50 transition-colors duration-500",
        viewMode === 'video' ? "bg-transparent" : "bg-surface-0 border-b border-white/5"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative">
            <div className="w-5 h-5 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                <Sparkles size={12} className="text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-surface-0 rounded-full" />
        </div>
        <span className="text-[11px] font-black text-white tracking-[0.15em] uppercase">Media Maestro</span>
      </div>
      
      <div className="flex items-center gap-4 text-[9px] text-white/30 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
            <span className="w-1 h-1 rounded-full bg-accent" />
            Stable v0.1.0
        </div>
      </div>
    </div>
  );
};
