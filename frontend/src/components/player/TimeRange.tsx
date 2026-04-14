import React, { useCallback, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

export const TimeRange: React.FC<{ className?: string }> = ({ className }) => {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  
  const [isSeeking, setIsSeeking] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsSeeking(true);
    handleSeek(e);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isSeeking) {
      handleSeek(e);
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsSeeking(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  
  const handleSeek = (e: React.PointerEvent) => {
    if (!barRef.current || duration === 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newPercentage = x / rect.width;
    seek(newPercentage * duration);
  };

  return (
    <div 
      ref={barRef}
      className={cn(
        "group relative h-4 w-full flex items-center cursor-pointer",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Background Track */}
      <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full transition-all group-hover:h-1.5" />
      
      {/* Progress Track */}
      <motion.div 
        className="absolute left-0 h-1 bg-accent rounded-full group-hover:h-1.5"
        style={{ width: `${percentage}%` }}
        transition={{ type: "spring", bounce: 0, duration: isSeeking ? 0 : 0.2 }}
      />
      
      {/* Thumb/Handle */}
      <motion.div 
        className={cn(
          "absolute size-3 bg-white rounded-full shadow-lg border border-black/20",
          "scale-0 transition-transform group-hover:scale-100",
          isSeeking && "scale-125"
        )}
        style={{ left: `calc(${percentage}% - 6px)` }}
      />
    </div>
  );
};
