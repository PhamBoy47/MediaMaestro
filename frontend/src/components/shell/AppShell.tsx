import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { usePlayerStore } from '@/stores/player-store';
import { Titlebar } from './Titlebar';
import { ModeSwitcher } from './ModeSwitcher';
import { MediaSidebar } from '@/components/library/MediaSidebar';
import { MiniPlayer } from '@/components/music/MiniPlayer';
import { SeanimePlayer } from '@/components/player/SeanimePlayer';
import { MusicLibrary } from '@/components/music/MusicLibrary';
import { MediaGrid } from '@/components/library/MediaGrid';
import { cn } from '@/lib/utils';

export const AppShell: React.FC = () => {
  const viewMode = useUIStore((s) => s.viewMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const playerMode = usePlayerStore((s) => s.mode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  // Show mini-player when music is playing but user is not in music view
  const showMiniPlayer = playerMode === 'music' && currentTrack !== null && viewMode !== 'music';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-0">
      {/* ── Titlebar ── */}
      <Titlebar />

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        {viewMode !== 'video' && sidebarOpen && (
          <aside className={cn(
            "w-[15rem] flex-shrink-0 border-r border-surface-3",
            "bg-surface-1 flex flex-col overflow-hidden"
          )}>
            <ModeSwitcher />
            <MediaSidebar />
          </aside>
        )}

        {/* ── Primary Content ── */}
        <main className={cn(
          "flex-1 flex flex-col overflow-hidden relative",
          viewMode === 'video' && "bg-black"
        )}>
          {viewMode === 'library' && <MediaGrid />}
          {viewMode === 'video' && <SeanimePlayer />}
          {viewMode === 'music' && <MusicLibrary />}
        </main>
      </div>

      {/* ── Mini-Player (Dopamine-style) ── */}
      {showMiniPlayer && (
        <div className="animate-slide-up">
          <MiniPlayer />
        </div>
      )}
    </div>
  );
};