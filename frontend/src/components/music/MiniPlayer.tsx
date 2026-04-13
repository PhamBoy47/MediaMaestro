import React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export const MiniPlayer: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPaused = usePlayerStore((s) => s.isPaused);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const repeat = usePlayerStore((s) => s.repeat);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const togglePause = usePlayerStore((s) => s.togglePause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const prevTrack = usePlayerStore((s) => s.prevTrack);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setRepeat = usePlayerStore((s) => s.setRepeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const setViewMode = useUIStore((s) => s.setViewMode);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "h-[4.5rem] glass-heavy flex items-center gap-4 px-4",
      "border-t border-surface-3 relative overflow-hidden"
    )}>
      {/* Background: Blurred album art */}
      {currentTrack.coverPath && (
        <img
          src={currentTrack.coverPath}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-[80px] saturate-200 opacity-20 pointer-events-none scale-110"
          aria-hidden
        />
      )}

      <div className="relative z-10 flex items-center gap-4 w-full">
        {/* Album Art Thumbnail */}
        <button
          onClick={() => setViewMode('music')}
          className="flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-surface-3 shadow-lg hover:ring-2 hover:ring-accent/50 transition-all"
          title="Open full player"
        >
          {currentTrack.coverPath ? (
            <img src={currentTrack.coverPath} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-lg bg-surface-4">♪</div>
          )}
        </button>

        {/* Track Info */}
        <div className="flex-shrink min-w-0 w-44">
          <p className="text-sm font-medium text-text-primary truncate">{currentTrack.title}</p>
          <p className="text-xs text-text-secondary truncate">{currentTrack.artist}</p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleShuffle}
            className={cn(
              "text-[11px] px-1.5 py-1 rounded transition",
              shuffle ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            ⇄
          </button>
          <button onClick={prevTrack} className="text-text-secondary hover:text-text-primary transition text-sm p-1">⏮</button>
          <button
            onClick={togglePause}
            className="w-9 h-9 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white transition shadow-lg"
          >
            <span className="text-sm">{isPaused || !isPlaying ? '▶' : '⏸'}</span>
          </button>
          <button onClick={nextTrack} className="text-text-secondary hover:text-text-primary transition text-sm p-1">⏭</button>
          <button
            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
            className={cn(
              "text-[11px] px-1.5 py-1 rounded transition",
              repeat !== 'off' ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {repeat === 'one' ? '🔁1' : '🔁'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2.5">
          <span className="text-[10px] text-text-tertiary font-mono tabular-nums w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 h-1 bg-surface-4 rounded-full overflow-hidden cursor-pointer group">
            <div className="h-full bg-accent rounded-full relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-accent rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-[10px] text-text-tertiary font-mono tabular-nums w-8">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-text-tertiary text-[10px]">{volume === 0 ? '🔇' : '🔉'}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-14 h-1 accent-accent cursor-pointer appearance-none bg-surface-4 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          />
        </div>
      </div>
    </div>
  );
};