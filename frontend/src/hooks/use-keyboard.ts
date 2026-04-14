import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useUIStore } from '@/stores/ui-store';

export function useKeyboardShortcuts() {
  const mode = usePlayerStore((s) => s.mode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      const player = usePlayerStore.getState();
      const ui = useUIStore.getState();

      switch (e.key) {
        // ── Mode Switching (Alt+Number) ──
        case '1':
          if (e.altKey) { ui.setViewMode('library'); e.preventDefault(); break; }
          if (!e.altKey) { player.seek(player.duration * 0.1); }
          break;
        case '2':
          if (e.altKey) { ui.setViewMode('video'); e.preventDefault(); break; }
          if (!e.altKey) { player.seek(player.duration * 0.2); }
          break;
        case '3':
          if (e.altKey) { ui.setViewMode('music'); e.preventDefault(); break; }
          if (!e.altKey) { player.seek(player.duration * 0.3); }
          break;

        // ── Playback ──
        case ' ':
        case 'k':
          e.preventDefault();
          if (player.mode !== 'idle') player.togglePause();
          break;
        case 'ArrowLeft':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.seekRelative(-5);
          }
          break;
        case 'ArrowRight':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.seekRelative(5);
          }
          break;
        case 'ArrowDown':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.setVolume(Math.max(0, player.volume - 5));
          }
          break;
        case 'ArrowUp':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.setVolume(Math.min(100, player.volume + 5));
          }
          break;
        case 'j':
          if (player.mode === 'video' && player.subtitleTracks.length > 0) {
            e.preventDefault();
            const currentIdx = player.subtitleTracks.findIndex(t => t.id === player.activeSubtitleTrack);
            const nextIdx = (currentIdx + 1) % player.subtitleTracks.length;
            player.setSubtitleTrack(player.subtitleTracks[nextIdx]?.id ?? -1);
          }
          break;
        case 'J':
          if (player.mode === 'video' && player.subtitleTracks.length > 0) {
            e.preventDefault();
            const currentIdx = player.subtitleTracks.findIndex(t => t.id === player.activeSubtitleTrack);
            const prevIdx = (currentIdx - 1 + player.subtitleTracks.length) % player.subtitleTracks.length;
            player.setSubtitleTrack(player.subtitleTracks[prevIdx]?.id ?? -1);
          }
          break;

        // ── Seek (MPV style) ──
        case '0':
        case 'Home':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.seek(0);
          }
          break;
        case '4': if (player.mode !== 'idle') player.seek(player.duration * 0.4); break;
        case '5': if (player.mode !== 'idle') player.seek(player.duration * 0.5); break;
        case '6': if (player.mode !== 'idle') player.seek(player.duration * 0.6); break;
        case '7': if (player.mode !== 'idle') player.seek(player.duration * 0.7); break;
        case '8': if (player.mode !== 'idle') player.seek(player.duration * 0.8); break;
        case '9': if (player.mode !== 'idle') player.seek(player.duration * 0.9); break;

        // ── Frame stepping ──
        case ',':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.seekRelative(-1 / 23.976);
          }
          break;
        case '.':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.seekRelative(1 / 23.976);
          }
          break;

        // ── Speed ──
        case '{':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.setPlaybackSpeed(Math.max(0.25, player.playbackSpeed - 0.25));
          }
          break;
        case '}':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.setPlaybackSpeed(Math.min(4, player.playbackSpeed + 0.25));
          }
          break;
        case 'Backspace':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.setPlaybackSpeed(1);
          }
          break;

        // ── View ──
        case 'f':
          if (player.mode !== 'idle') {
            e.preventDefault();
            player.toggleFullscreen();
          }
          break;
        case 'Escape':
          if (player.mode !== 'idle') {
            player.stop();
          }
          break;

        // ── Screenshot ──
        case 's':
          if (e.shiftKey) {
            e.preventDefault();
            player.seek(player.currentTime);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isPlaying]);
}