import React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils';

interface AudioTrackSelectorProps {
  open: boolean;
  onToggle: () => void;
}

export const AudioTrackSelector: React.FC<AudioTrackSelectorProps> = ({ open, onToggle }) => {
  const audioTracks = usePlayerStore((s) => s.audioTracks);
  const activeAudioTrack = usePlayerStore((s) => s.activeAudioTrack);
  const setAudioTrack = usePlayerStore((s) => s.setAudioTrack);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition",
          activeAudioTrack !== null && activeAudioTrack > 1
            ? "text-accent bg-accent/15 hover:bg-accent/25"
            : "text-white/70 hover:text-white hover:bg-white/10"
        )}
        title="Audio tracks (A)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 py-1 min-w-[180px] bg-surface-0/95 backdrop-blur-xl rounded-lg border border-surface-3 shadow-2xl animate-fade-in z-50">
          <div className="px-3 py-1.5 text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Audio</div>
          {audioTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => { setAudioTrack(track.id); onToggle(); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-surface-3 transition",
                activeAudioTrack === track.id ? "text-accent" : "text-text-primary"
              )}
            >
              {track.title} ({track.lang})
            </button>
          ))}
        </div>
      )}
    </div>
  );
};