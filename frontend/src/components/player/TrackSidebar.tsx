import React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Subtitles, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackSidebar: React.FC<TrackSidebarProps> = ({ isOpen, onClose }) => {
  const subtitleTracks = usePlayerStore((s) => s.subtitleTracks);
  const audioTracks = usePlayerStore((s) => s.audioTracks);
  const activeSub = usePlayerStore((s) => s.activeSubtitleTrack);
  const activeAudio = usePlayerStore((s) => s.activeAudioTrack);
  
  const setSubtitleTrack = usePlayerStore((s) => s.setSubtitleTrack);
  const setAudioTrack = usePlayerStore((s) => s.setAudioTrack);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-[90]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-80 bg-surface-1/95 backdrop-blur-3xl border-l border-white/5 z-[100] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Subtitles size={20} className="text-accent" />
                Media Settings
              </h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Subtitle Section */}
              <section className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/40 flex items-center gap-2">
                  Subtitle Tracks
                </h4>
                <div className="space-y-1">
                  {subtitleTracks.length === 0 ? (
                    <div className="text-xs text-white/20 italic p-3">No subtitles found</div>
                  ) : (
                    subtitleTracks.map((track) => (
                      <TrackItem
                        key={track.id}
                        label={`${track.title} (${track.lang})`}
                        badge={track.codec}
                        active={activeSub === track.id}
                        onClick={() => setSubtitleTrack(track.id)}
                      />
                    ))
                  )}
                  <TrackItem 
                    label="Disable Subtitles"
                    active={activeSub === -1}
                    onClick={() => setSubtitleTrack(-1)}
                  />
                </div>
              </section>

              {/* Audio Section */}
              <section className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/40 flex items-center gap-2 text-purple-400">
                  Audio Tracks (AID)
                </h4>
                <div className="space-y-1">
                  {audioTracks.map((track) => (
                    <TrackItem
                      key={track.id}
                      label={`${track.title} (${track.lang})`}
                      badge={track.codec}
                      active={activeAudio === track.id}
                      onClick={() => setAudioTrack(track.id)}
                      icon={Volume2}
                    />
                  ))}
                </div>
              </section>
            </div>
            
            <div className="p-6 bg-black/20 border-t border-white/5">
              <div className="text-[10px] text-white/20 font-medium">
                Tip: Press 'S' to cycle subtitles quickly and 'A' for audio.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface TrackItemProps {
  label: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
  icon?: any;
}

const TrackItem: React.FC<TrackItemProps> = ({ label, badge, active, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between p-3 rounded-xl transition-all group relative overflow-hidden",
      active 
        ? "bg-accent/20 text-accent border border-accent/20" 
        : "text-white/60 hover:bg-white/5 border border-transparent"
    )}
  >
    <div className="flex items-center gap-3 relative z-10">
      {Icon && <Icon size={14} className={active ? "text-accent" : "text-white/20"} />}
      <span className="text-sm font-medium truncate">{label}</span>
      {badge && (
        <span className={cn(
          "text-[8px] px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-bold uppercase",
          active ? "text-accent/80" : "text-white/20"
        )}>
          {badge}
        </span>
      )}
    </div>
    {active && (
      <motion.div layoutId="track-check" className="absolute right-3 z-10">
        <Check size={16} strokeWidth={3} />
      </motion.div>
    )}
    
    {/* Hover highlight line */}
    {!active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    )}
  </button>
);
