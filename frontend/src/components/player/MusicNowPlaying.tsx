import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { motion, AnimatePresence } from 'framer-motion';
import { extractDominantColor, RGB } from '@/lib/color-utils';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Volume2, ListMusic
} from 'lucide-react';
import { TimeRange } from './TimeRange';

export const MusicNowPlaying: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPaused = usePlayerStore((s) => s.isPaused);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  const togglePause = usePlayerStore((s) => s.togglePause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const prevTrack = usePlayerStore((s) => s.prevTrack);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  const [bgColor, setBgColor] = useState<RGB>({ r: 20, g: 20, b: 20 });

  useEffect(() => {
    if (currentTrack?.coverPath) {
      extractDominantColor(currentTrack.coverPath).then(setBgColor);
    }
  }, [currentTrack]);

  if (!currentTrack) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
      {/* Dynamic Background Wrapper */}
      <motion.div 
        animate={{ 
          background: `radial-gradient(circle at center, rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b}) 0%, rgb(5, 5, 5) 100%)` 
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="absolute inset-0 opacity-40 scale-150 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-4xl px-12 flex flex-col items-center">
        {/* Album Art Section */}
        <motion.div 
          key={currentTrack.id}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative group"
        >
          {/* Deep Shadow / Glow */}
          <div 
            className="absolute inset-0 blur-3xl opacity-20 transition-opacity group-hover:opacity-40"
            style={{ backgroundColor: `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})` }}
          />
          
          <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {currentTrack.coverPath ? (
              <img 
                src={currentTrack.coverPath} 
                alt={currentTrack.album} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                <ListMusic size={64} className="text-white/20" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Info Section */}
        <div className="mt-12 text-center w-full max-w-lg">
          <motion.h1 
            key={`${currentTrack.id}-title`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white mb-2 truncate"
          >
            {currentTrack.title}
          </motion.h1>
          <motion.p 
            key={`${currentTrack.id}-artist`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/60 font-medium truncate"
          >
            {currentTrack.artist} • {currentTrack.album}
          </motion.p>
        </div>

        {/* Progress Section */}
        <div className="w-full mt-10 space-y-4">
          <TimeRange />
        </div>

        {/* Detailed Controls (Harmonoid Style) */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button 
            onClick={toggleShuffle}
            className={cn(
              "p-3 rounded-full transition-all",
              shuffle ? "text-accent bg-accent/10" : "text-white/40 hover:text-white/60"
            )}
          >
            <Shuffle size={20} />
          </button>

          <button 
            onClick={prevTrack}
            className="p-3 text-white/80 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95"
          >
            <SkipBack size={32} fill="currentColor" />
          </button>

          <button 
            onClick={togglePause}
            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            {isPaused || !isPlaying ? <Play size={36} fill="black" /> : <Pause size={36} fill="black" />}
          </button>

          <button 
            onClick={nextTrack}
            className="p-3 text-white/80 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95"
          >
            <SkipForward size={32} fill="currentColor" />
          </button>

          <button 
            className={cn(
              "p-3 rounded-full transition-all",
              repeat !== 'off' ? "text-accent bg-accent/10" : "text-white/40 hover:text-white/60"
            )}
          >
            <Repeat size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper for class consolidation
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
