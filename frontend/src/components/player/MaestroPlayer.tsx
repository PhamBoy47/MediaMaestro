import React, { useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { PlayerOverlay } from './PlayerOverlay';
import { SubtitleDisplay } from './SubtitleDisplay';
import { TorrentProgress } from './TorrentProgress';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { MusicNowPlaying } from './MusicNowPlaying';
import { TrackSidebar } from './TrackSidebar';

export const PremiumPlayer: React.FC = () => {
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isTrackSidebarOpen, setIsTrackSidebarOpen] = useState(false);
  
  const mode = usePlayerStore((s) => s.mode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const togglePause = usePlayerStore((s) => s.togglePause);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts();

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;
    togglePause();
  }, [togglePause]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;
    toggleFullscreen();
  }, [toggleFullscreen]);

  const toggleTrackSidebar = () => setIsTrackSidebarOpen(prev => !prev);

  if (mode === 'idle') return null;

  return (
    <div
      className={cn(
        "relative w-full h-full select-none overflow-hidden bg-transparent",
        !cursorVisible && "cursor-none"
      )}
      onClick={handleVideoClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* ── Content Layer ── */}
      <AnimatePresence mode="wait">
        {mode === 'music' ? (
          <motion.div
            key="music"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <MusicNowPlaying />
          </motion.div>
        ) : (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* MPV Background Layer */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 mx-auto backdrop-blur-xl shadow-2xl">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center animate-pulse">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                    </div>
                  </div>
                  <p className="text-white/60 text-lg font-medium">Ready to Play</p>
                  <p className="text-white/40 text-sm mt-1">Open a file or drop a link</p>
                </div>
              )}
              
              {/* Buffering indicator */}
              <AnimatePresence>
                {isBuffering && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-accent animate-spin" />
                      <span className="text-white/80 font-medium tracking-widest uppercase text-xs">Buffering</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Subtitle Overlay */}
            <div className="relative z-10 pointer-events-none">
              <SubtitleDisplay />
            </div>
            
            {/* Torrent Stream Progress */}
            <div className="absolute top-20 right-6 z-30 pointer-events-none">
              <TorrentProgress />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Premium Control Overlay (Shared) ── */}
      <PlayerOverlay onOpenTracks={toggleTrackSidebar} />

      {/* ── Sidebars ── */}
      <TrackSidebar 
        isOpen={isTrackSidebarOpen} 
        onClose={() => setIsTrackSidebarOpen(false)} 
      />
    </div>
  );
};