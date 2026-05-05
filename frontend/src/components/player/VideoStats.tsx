import React, { useEffect } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { motion } from 'framer-motion';
import { X, Film, Volume2, Cpu, HardDrive, MonitorPlay } from 'lucide-react';

const formatBitrate = (bps?: number): string => {
  if (!bps || bps <= 0) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps.toFixed(0)} bps`;
};

const formatSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const formatSampleRate = (rate?: number): string => {
  if (!rate) return '—';
  return `${(rate / 1000).toFixed(1)} kHz`;
};

const formatChannels = (ch?: number): string => {
  if (!ch) return '—';
  switch (ch) {
    case 1: return 'Mono';
    case 2: return 'Stereo';
    case 6: return '5.1 Surround';
    case 8: return '7.1 Surround';
    default: return `${ch}ch`;
  }
};

interface StatRowProps {
  label: string;
  value: string;
}

const StatRow: React.FC<StatRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
    <span className="text-[10px] uppercase tracking-wider font-bold text-white/30">{label}</span>
    <span className="text-xs font-medium text-white/80 tabular-nums">{value}</span>
  </div>
);

interface StatSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const StatSection: React.FC<StatSectionProps> = ({ icon, title, children }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/50">{title}</span>
    </div>
    <div className="pl-1">{children}</div>
  </div>
);

export const VideoStats: React.FC = () => {
  const mediaInfo = usePlayerStore((s) => s.mediaInfo);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const playbackSpeed = usePlayerStore((s) => s.playbackSpeed);
  const volume = usePlayerStore((s) => s.volume);
  const videoSource = usePlayerStore((s) => s.videoSource);
  const toggleStats = usePlayerStore((s) => s.toggleStats);
  const refreshMediaInfo = usePlayerStore((s) => s.refreshMediaInfo);

  // Refresh media info periodically for live bitrate data
  useEffect(() => {
    const interval = setInterval(refreshMediaInfo, 3000);
    return () => clearInterval(interval);
  }, [refreshMediaInfo]);

  const resolution = mediaInfo.width && mediaInfo.height
    ? `${mediaInfo.width}×${mediaInfo.height}`
    : '—';

  const qualityLabel = (() => {
    if (!mediaInfo.height) return '';
    if (mediaInfo.height >= 2160) return '4K';
    if (mediaInfo.height >= 1440) return '2K';
    if (mediaInfo.height >= 1080) return 'FHD';
    if (mediaInfo.height >= 720) return 'HD';
    return 'SD';
  })();

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filename = mediaInfo.filename || videoSource?.split(/[/\\]/).pop() || '—';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute top-20 right-6 z-[100] w-72 pointer-events-auto"
    >
      <div className="rounded-2xl bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <MonitorPlay size={14} className="text-accent" />
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/70">Media Info</span>
            {qualityLabel && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-accent/20 text-accent border border-accent/20">
                {qualityLabel}
              </span>
            )}
          </div>
          <button
            onClick={toggleStats}
            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {/* File */}
          <StatSection icon={<HardDrive size={12} className="text-emerald-400" />} title="File">
            <StatRow label="Name" value={filename.length > 28 ? filename.slice(0, 28) + '…' : filename} />
            <StatRow label="Size" value={formatSize(mediaInfo.fileSize as number)} />
          </StatSection>

          {/* Video */}
          <StatSection icon={<Film size={12} className="text-purple-400" />} title="Video">
            <StatRow label="Codec" value={mediaInfo.videoCodec || '—'} />
            <StatRow label="Resolution" value={resolution} />
            <StatRow label="Pixel Fmt" value={mediaInfo.pixelFormat || '—'} />
            <StatRow label="Bitrate" value={formatBitrate(mediaInfo.videoBitrate)} />
          </StatSection>

          {/* Audio */}
          <StatSection icon={<Volume2 size={12} className="text-blue-400" />} title="Audio">
            <StatRow label="Codec" value={mediaInfo.audioCodec || '—'} />
            <StatRow label="Channels" value={formatChannels(mediaInfo.audioChannels)} />
            <StatRow label="Sample Rate" value={formatSampleRate(mediaInfo.sampleRate)} />
            <StatRow label="Bitrate" value={formatBitrate(mediaInfo.audioBitrate)} />
          </StatSection>

          {/* Playback */}
          <StatSection icon={<Cpu size={12} className="text-amber-400" />} title="Playback">
            <StatRow label="Position" value={`${formatTime(currentTime)} / ${formatTime(duration)}`} />
            <StatRow label="Speed" value={`${playbackSpeed}×`} />
            <StatRow label="Volume" value={`${Math.round(volume)}%`} />
          </StatSection>
        </div>
      </div>
    </motion.div>
  );
};
