import React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils';

interface PlayerTopBarProps {
  visible: boolean;
}

export const PlayerTopBar: React.FC<PlayerTopBarProps> = ({ visible }) => {
  const videoTitle = usePlayerStore((s) => s.videoTitle);
  const videoSource = usePlayerStore((s) => s.videoSource);
  const stop = usePlayerStore((s) => s.stop);

  const displayTitle = videoTitle || 
    videoSource?.split('/').pop()?.replace(/\.[^.]+$/, '') || 
    'Now Playing';

  return (
    <div className="relative">
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      
      <div className="relative flex items-center gap-4 px-6 pt-4">
        {/* Back button */}
        <button
          onClick={stop}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-white text-sm font-medium truncate flex-1">
          {displayTitle}
        </h2>

        {/* Settings / Info (right side) */}
        <div className="flex items-center gap-2">
          {/* Episode info would go here */}
        </div>
      </div>
    </div>
  );
};