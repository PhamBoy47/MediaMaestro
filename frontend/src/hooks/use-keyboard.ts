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
        // ── Playback ──
        case ' ':
        case 'k':
          e.preventDefault();
          if (player.mode !== 'idle') player.togglePause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          player.seekRelative(5);
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setVolume(Math.max(0, player.volume - 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setVolume(Math.min(100, player.volume + 5));
          break;
        case 'j':
          e.preventDefault();
          // Cycle subtitle tracks
          if (player.subtitleTracks.length > 0) {
            const currentIdx = player.subtitleTracks.findIndex(t => t.id === player.activeSubtitleTrack);
            const nextIdx = (currentIdx + 1) % player.subtitleTracks.length;
            player.setSubtitleTrack(player.subtitleTracks[nextIdx]?.id ?? -1);
          }
          break;
        case 'J':
          e.preventDefault();
          // Cycle subtitle tracks backwards
          if (player.subtitleTracks.length > 0) {
            const currentIdx = player.subtitleTracks.findIndex(t => t.id === player.activeSubtitleTrack);
            const prevIdx = (currentIdx - 1 + player.subtitleTracks.length) % player.subtitleTracks.length;
            player.setSubtitleTrack(player.subtitleTracks[prevIdx]?.id ?? -1);
          }
          break;

        // ── Seek (MPV style) ──
        case '0':
        case 'Home':
          e.preventDefault();
          player.seek(0);
          break;
        case '1': player.seek(player.duration * 0.1); break;
        case '2': player.seek(player.duration * 0.2); break;
        case '3': player.seek(player.duration * 0.3); break;
        case '4': player.seek(player.duration * 0.4); break;
        case '5': player.seek(player.duration * 0.5); break;
        case '6': player.seek(player.duration * 0.6); break;
        case '7': player.seek(player.duration * 0.7); break;
        case '8': player.seek(player.duration * 0.8); break;
        case '9': player.seek(player.duration * 0.9); break;

        // ── Frame stepping ──
        case ',':
          e.preventDefault();
          player.seekRelative(-1 / 23.976); // One frame back
          break;
        case '.':
          e.preventDefault();
          player.seekRelative(1 / 23.976); // One frame forward
          break;

        // ── Speed ──
        case '{':
          e.preventDefault();
          player.setPlaybackSpeed(Math.max(0.25, player.playbackSpeed - 0.25));
          break;
        case '}':
          e.preventDefault();
          player.setPlaybackSpeed(Math.min(4, player.playbackSpeed + 0.25));
          break;
        case 'Backspace':
          e.preventDefault();
          player.setPlaybackSpeed(1);
          break;

        // ── View ──
        case 'f':
          e.preventDefault();
          player.toggleFullscreen();
          break;
        case 'Escape':
          if (mode === 'video') {
            player.stop();
          }
          break;

        // ── Screenshot ──
        case 's':
          if (e.shiftKey) {
            e.preventDefault();
            // Screenshot with subtitles
            player.seek(player.currentTime); // Trigger MPV screenshot
          }
          break;

        // ── Mode Switching ──
        case '1':
          if (e.altKey) { ui.setViewMode('library'); e.preventDefault(); }
          break;
        case '2':
          if (e.altKey) { ui.setViewMode('video'); e.preventDefault(); }
          break;
        case '3':
          if (e.altKey) { ui.setViewMode('music'); e.preventDefault(); }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isPlaying]);
}