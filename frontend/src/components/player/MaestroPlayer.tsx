import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { PlayerTopBar } from './PlayerTopBar';
import { PlayerControls } from './PlayerControls';
import { SeekBar } from './SeekBar';
import { SubtitleDisplay } from './SubtitleDisplay';
import { TorrentProgress } from './TorrentProgress';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard';
import { cn } from '@/lib/utils';

export const SeanimePlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  
  const [showControls, setShowControls] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const mode = usePlayerStore((s) => s.mode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPaused = usePlayerStore((s) => s.isPaused);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const videoSource = usePlayerStore((s) => s.videoSource);
  const videoTitle = usePlayerStore((s) => s.videoTitle);

  // ── Auto-hide controls (Seanime behavior: 3 seconds) ──
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    setCursorVisible(true);
    
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    
    if (isPlaying && !isPaused) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setCursorVisible(false);
      }, 3000);
    }
  }, [isPlaying, isPaused]);

  // ── Mouse movement ──
  const handleMouseMove = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // ── Click to toggle pause ──
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking on controls
    if ((e.target as HTMLElement).closest('[data-controls]')) return;
    usePlayerStore.getState().togglePause();
  }, []);

  // ── Double-click to toggle fullscreen ──
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-controls]')) return;
    usePlayerStore.getState().toggleFullscreen();
    setIsFullscreen((prev) => !prev);
  }, []);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts();

  // ── Initial show on mount ──
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (mode !== 'video' && mode !== 'idle') return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black select-none",
        !cursorVisible && "cursor-none"
      )}
      onMouseMove={handleMouseMove}
      onClick={handleVideoClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* ── Video Render Area ── */}
      {/* 
        MPV renders directly to the native window via --wid.
        The React webview floats on top with transparent background.
        The video is visible through the transparent areas.
        
        If using the external MPV window approach (Seanime default),
        this area shows a black screen with a "Playing in MPV..." indicator.
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!isPlaying && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-white/40 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-white/40 text-sm">Open a file or paste a magnet link to start</p>
          </div>
        )}
        
        {/* Buffering indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ── Subtitle Overlay ── */}
      <SubtitleDisplay />

      {/* ── Controls Overlay (Seanime-style gradient system) ── */}
      <div
        data-controls
        className={cn(
          "absolute inset-0 flex flex-col justify-between",
          "transition-opacity duration-300 ease-out",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Top gradient bar */}
        <PlayerTopBar visible={showControls} />

        {/* Center: nothing (video visible) */}

        {/* Bottom gradient + controls */}
        <div className="relative">
          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
          
          <div className="relative px-6 pb-6 space-y-3">
            {/* Seek bar */}
            <SeekBar />

            {/* Control buttons row */}
            <PlayerControls />
          </div>
        </div>
      </div>

      {/* ── Torrent Stream Progress (when streaming) ── */}
      <TorrentProgress />
    </div>
  );
};