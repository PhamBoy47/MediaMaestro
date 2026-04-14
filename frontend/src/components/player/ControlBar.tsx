import React, { useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Maximize, Minimize,
  Settings, Subtitles, ListMusic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const ControlBar: React.FC<{ onOpenTracks: () => void }> = ({ onOpenTracks }) => {
  const mode = usePlayerStore((s) => s.mode);
  const isPaused = usePlayerStore((s) => s.isPaused);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [timeMode, setTimeMode] = useState<'elapsed' | 'remaining'>('elapsed');

  const togglePause = usePlayerStore((s) => s.togglePause);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const prevTrack = usePlayerStore((s) => s.prevTrack);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimeClick = () => {
    setTimeMode(p => p === 'elapsed' ? 'remaining' : 'elapsed');
  };

  const displayedTime = timeMode === 'elapsed' 
    ? formatTime(currentTime) 
    : `-${formatTime(Math.max(0, duration - currentTime))}`;

  return (
    <div className="flex items-center justify-between h-12 px-2 text-white/90">
      {/* Left Section: Transport */}
      <div className="flex items-center gap-1">
        <ControlButton onClick={togglePause}>
          <AnimatePresence mode="wait">
            {isPaused || !isPlaying ? (
              <motion.div
                key="play"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Play className="fill-current" size={24} />
              </motion.div>
            ) : (
              <motion.div
                key="pause"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Pause className="fill-current" size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </ControlButton>

        <ControlButton onClick={prevTrack}>
          <SkipBack size={20} fill={mode === 'music' ? 'currentColor' : 'none'} />
        </ControlButton>
        <ControlButton onClick={nextTrack}>
          <SkipForward size={20} fill={mode === 'music' ? 'currentColor' : 'none'} />
        </ControlButton>

        {/* Volume */}
        <div 
          className="flex items-center gap-2 px-2"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button 
            className="hover:text-white transition-colors"
            onClick={() => setVolume(volume === 0 ? 100 : 0)}
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <AnimatePresence>
            {showVolumeSlider && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 80, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="h-1 bg-white/20 rounded-full relative overflow-hidden"
              >
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="h-full bg-accent" 
                  style={{ width: `${volume}%` }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timestamp */}
        <div 
          className="px-2 text-sm font-medium tabular-nums cursor-pointer hover:text-white transition-colors"
          onClick={handleTimeClick}
        >
          {displayedTime} <span className="text-white/40">/ {formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Section: Features */}
      <div className="flex items-center gap-1">
        {mode === 'video' && (
          <ControlButton onClick={onOpenTracks}>
            <Subtitles size={20} />
          </ControlButton>
        )}
        <ControlButton onClick={onOpenTracks}>
          <Settings size={20} />
        </ControlButton>
        <ControlButton onClick={toggleFullscreen}>
          {mode === 'music' ? <ListMusic size={20} /> : <Maximize size={20} />}
        </ControlButton>
      </div>
    </div>
  );
};

const ControlButton: React.FC<{ 
  onClick?: () => void, 
  children: React.ReactNode,
  className?: string
}> = ({ onClick, children, className }) => (
  <button 
    onClick={onClick}
    className={cn(
      "p-2 hover:bg-white/10 rounded-lg transition-all active:scale-95 group",
      className
    )}
  >
    <div className="group-hover:scale-110 transition-transform">
      {children}
    </div>
  </button>
);
