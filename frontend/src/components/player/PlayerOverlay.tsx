import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { TimeRange } from './TimeRange';
import { ControlBar } from './ControlBar';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlayerOverlayProps {
  onOpenTracks: () => void;
}

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({ onOpenTracks }) => {
  const [showControls, setShowControls] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const mode = usePlayerStore((s) => s.mode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPaused = usePlayerStore((s) => s.isPaused);
  const videoTitle = usePlayerStore((s) => s.videoTitle);
  const videoSource = usePlayerStore((s) => s.videoSource);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const stop = usePlayerStore((s) => s.stop);

  const displayTitle = mode === 'music' ? (currentTrack?.title || 'Unknown Track') : (
    videoTitle || 
    videoSource?.split('/').pop()?.replace(/\.[^.]+$/, '') || 
    'Now Playing'
  );

  const displaySubtitle = mode === 'music' ? currentTrack?.artist : 'Now Playing';

  const resetHideTimer = useCallback((e?: React.MouseEvent) => {
    setShowControls(true);
    setShowTopBar(true);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    // Proximity check: If mouse is at the bottom 25%, don't hide
    if (e && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const yPercent = (e.clientY - rect.top) / rect.height;
        if (yPercent > 0.75) {
            return;
        }
    }

    if (isPlaying && !isPaused) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowTopBar(false);
      }, 3000);
    }
  }, [isPlaying, isPaused]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 flex flex-col justify-between overflow-hidden"
      onMouseMove={resetHideTimer}
      onClick={() => resetHideTimer()}
    >
      {/* Top Section */}
      <AnimatePresence>
        {showTopBar && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="relative z-20 pointer-events-auto"
          >
            {/* Top Gradient */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            
            <div className="relative flex items-center gap-4 px-6 pt-6">
              <button
                onClick={stop}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex flex-col truncate">
                <span className="text-white/40 text-[10px] uppercase tracking-wider font-bold">{displaySubtitle}</span>
                <h2 className="text-white text-lg font-medium truncate drop-shadow-lg">
                  {displayTitle}
                </h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Section */}
      <div className="relative z-20 pointer-events-auto">
        {/* Bottom Gradient Overlay (Stronger when controls shown) */}
        <div className={cn(
          "absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none transition-opacity duration-500",
          showControls ? "opacity-100" : "opacity-0"
        )} />

        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative px-6 pb-6 space-y-2"
            >
              <TimeRange />
              <ControlBar onOpenTracks={onOpenTracks} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
