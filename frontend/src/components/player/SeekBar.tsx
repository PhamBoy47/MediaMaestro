import React, { useCallback, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils';

export const SeekBar: React.FC = () => {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverPosition(ratio * 100);
  }, [duration]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }, [duration, seek]);

  return (
    <div className="space-y-1">
      <div
        ref={barRef}
        className="group relative h-[3px] hover:h-[6px] bg-white/20 rounded-full cursor-pointer transition-all duration-150"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => { if (!isDragging) setHoverTime(null); }}
      >
        {/* Buffer indicator (for streaming) */}
        <div
          className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
          style={{ width: `${Math.min(100, progress + 15)}%` }}
        />

        {/* Progress */}
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-full"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-3 h-3 bg-accent rounded-full shadow-lg shadow-accent/50",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
          style={{ left: `${progress}%` }}
        />

        {/* Hover time tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] font-mono tabular-nums whitespace-nowrap"
            style={{ left: `${hoverPosition}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between">
        <span className="text-white/50 text-[11px] font-mono tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-white/50 text-[11px] font-mono tabular-nums">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};