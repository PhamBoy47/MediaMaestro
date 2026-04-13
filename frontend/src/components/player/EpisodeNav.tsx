import React from 'react';
import { usePlayerStore } from '@/stores/player-store';

interface EpisodeNavProps {
  direction: 'prev' | 'next';
}

export const EpisodeNav: React.FC<EpisodeNavProps> = ({ direction }) => {
  // In a full implementation, this hooks into the anime library
  // to know what the previous/next episode file is.
  const isPrev = direction === 'prev';

  const handleClick = () => {
    // Placeholder: seek to start for prev, or do nothing for next
    if (isPrev) {
      usePlayerStore.getState().seek(0);
    }
    // Real implementation:
    // const library = useLibraryStore.getState();
    // const nextFile = library.getNextEpisode(currentFile);
    // if (nextFile) usePlayerStore.getState().playFile(nextFile.path);
  };

  return (
    <button
      onClick={handleClick}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
      title={isPrev ? 'Previous episode (PgUp)' : 'Next episode (PgDown)'}
      // disabled={!hasPrevNext} // Enable when library is connected
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {isPrev ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        )}
      </svg>
    </button>
  );
};