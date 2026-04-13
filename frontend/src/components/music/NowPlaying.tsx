import React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils';

export const NowPlaying: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPaused = usePlayerStore((s) => s.isPaused);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);

  const togglePause = usePlayerStore((s) => s.togglePause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const prevTrack = usePlayerStore((s) => s.prevTrack);

  if (!currentTrack) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-text-tertiary">
        <span className="text-4xl mb-3">♪</span>
        <p className="text-sm">Nothing playing</p>
      </div>
    );
  }

  const upNext = queue.slice(queueIndex + 1, queueIndex + 6);

  return (
    <div className="h-full flex flex-col items-center p-6 gap-5">
      {/* Album Art */}
      <div className="relative w-52 h-52 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 group">
        {currentTrack.coverPath ? (
          <img
            src={currentTrack.coverPath}
            alt={currentTrack.album}
            className={cn(
              "w-full h-full object-cover transition-transform duration-700",
              !isPaused && "group-hover:scale-105"
            )}
          />
        ) : (
          <div className="w-full h-full bg-surface-3 flex items-center justify-center text-5xl text-text-tertiary">♪</div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={togglePause}
            className="w-14 h-14 rounded-full bg-accent/90 hover:bg-accent flex items-center justify-center text-white shadow-xl transition"
          >
            <span className="text-2xl">{isPaused || !isPlaying ? '▶' : '⏸'}</span>
          </button>
        </div>
      </div>

      {/* Track Info */}
      <div className="text-center w-full">
        <h3 className="text-lg font-semibold text-text-primary truncate">{currentTrack.title}</h3>
        <p className="text-sm text-text-secondary truncate mt-1">{currentTrack.artist}</p>
        <p className="text-xs text-text-tertiary truncate mt-0.5">{currentTrack.album}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button onClick={prevTrack} className="text-text-secondary hover:text-text-primary text-lg transition">⏮</button>
        <button
          onClick={togglePause}
          className="w-12 h-12 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white text-xl transition shadow-lg"
        >
          {isPaused || !isPlaying ? '▶' : '⏸'}
        </button>
        <button onClick={nextTrack} className="text-text-secondary hover:text-text-primary text-lg transition">⏭</button>
      </div>

      {/* Up Next */}
      {upNext.length > 0 && (
        <div className="flex-1 w-full overflow-hidden mt-2">
          <h4 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Up Next</h4>
          <div className="space-y-0.5 overflow-y-auto">
            {upNext.map((track, i) => (
              <div
                key={`${track.id}-${i}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-2 cursor-pointer transition"
                onClick={() => usePlayerStore.getState().playTrack(track)}
              >
                <span className="text-[10px] text-text-tertiary w-3">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary truncate">{track.title}</p>
                  <p className="text-[10px] text-text-tertiary truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};