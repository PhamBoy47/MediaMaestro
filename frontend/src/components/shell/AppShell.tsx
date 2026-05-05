import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/ui-store';
import { usePlayerStore } from '../../stores/player-store';
import { Titlebar } from './Titlebar';
import { ModeSwitcher } from './ModeSwitcher';
import { MediaSidebar } from '../library/MediaSidebar';
import { MiniPlayer } from '../music/MiniPlayer';
import { PremiumPlayer } from '../player/MaestroPlayer';
import { MusicLibrary } from '../music/MusicLibrary';
import { LibraryView } from '../library/LibraryView';
import { SettingsView } from '../settings/SettingsView';
import { cn } from '../../lib/utils';

export const AppShell: React.FC = () => {
  const viewMode = useUIStore((s) => s.viewMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const playerMode = usePlayerStore((s) => s.mode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  // Auto-return to library if player is idle in video mode (e.g. after Stop or on Boot)
  React.useEffect(() => {
    if (viewMode === 'video' && playerMode === 'idle') {
      useUIStore.getState().setViewMode('library');
    }
  }, [viewMode, playerMode]);

  // Toggle transparency class for video parenting
  React.useEffect(() => {
    if (viewMode === 'video' && playerMode !== 'idle') {
      document.documentElement.classList.add('layers-transparent');
    } else {
      document.documentElement.classList.remove('layers-transparent');
    }
  }, [viewMode, playerMode]);

  // Show mini-player when music is playing but user is not in the full player view
  const showMiniPlayer = playerMode === 'music' && currentTrack !== null && viewMode !== 'video' && viewMode !== 'music';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-white relative">
      {/* ── Titlebar (Absolute when in video mode for full-window reach) ── */}
      <div className={cn(
        "z-50 w-full",
        viewMode === 'video' ? "absolute top-0 left-0" : "relative"
      )}>
        <Titlebar />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Sidebar (Only visible in non-video modes or if specific UX is requested) ── */}
        {sidebarOpen && viewMode !== 'video' && (
          <aside className={cn(
            "w-[16rem] flex-shrink-0 border-r border-white/5",
            "bg-surface-1 flex flex-col overflow-hidden z-40"
          )}>
            <ModeSwitcher />
            <MediaSidebar />
          </aside>
        )}

        {/* ── Primary Content ── */}
        <main className={cn(
          "flex-1 flex flex-col overflow-hidden relative",
          viewMode === 'video' ? "absolute inset-0 z-0 bg-transparent" : "bg-surface-0"
        )}>
          {viewMode === 'library' && <LibraryView />}
          {viewMode === 'video' && <PremiumPlayer />}
          {viewMode === 'music' && <MusicLibrary />}
          {viewMode === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* ── Global Mini Player ── */}
      <AnimatePresence>
        {showMiniPlayer && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]"
          >
            <MiniPlayer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};