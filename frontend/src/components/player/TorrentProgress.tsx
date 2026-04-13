import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useTorrentStore } from '@/stores/torrent-store';
import * as App from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';

export const TorrentProgress: React.FC = () => {
  const mode = usePlayerStore((s) => s.mode);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const activeHash = useTorrentStore((s) => s.activeHash);
  
  const [speed, setSpeed] = useState(0);
  const [peers, setPeers] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (mode !== 'video' || !activeHash) return;

    const interval = setInterval(async () => {
      try {
        const status = await App.TorrentGetStatus(activeHash);
        if (status) {
          setSpeed(status.speed);
          setPeers(status.peers);
          setProgress(status.progress);
        }
      } catch (e) {
        // Torrent might not exist anymore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [mode, activeHash]);

  if (mode !== 'video' || !activeHash) return null;

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1048576) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
  };

  return (
    <div className={cn(
      "absolute top-4 right-4 z-20 flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-300",
      isBuffering ? "bg-amber-500/20 border border-amber-500/30" : "bg-black/40 border border-white/5"
    )}>
      {/* Peers indicator */}
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "w-2 h-2 rounded-full",
          peers > 0 ? "bg-green-400 shadow-sm shadow-green-400/50" : "bg-red-400"
        )} />
        <span className="text-[11px] text-white/60 tabular-nums">{peers} peers</span>
      </div>

      {/* Speed */}
      <span className="text-[11px] text-white/60 tabular-nums">{formatSpeed(speed)}</span>

      {/* Buffering warning */}
      {isBuffering && (
        <span className="text-[11px] text-amber-300 font-medium animate-pulse">Buffering...</span>
      )}
    </div>
  );
};