import React, { useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { VolumeSlider } from './VolumeSlider';
import { SubtitleSelector } from './SubtitleSelector';
import { AudioTrackSelector } from './AudioTrackSelector';
import { ShaderPanel } from './ShaderPanel';
import { EpisodeNav } from './EpisodeNav';
import { cn } from '@/lib/utils';

export const PlayerControls: React.FC = () => {
  const [showSubSelector, setShowSubSelector] = useState(false);
  const [showAudioSelector, setShowAudioSelector] = useState(false);
  const [showShaderPanel, setShowShaderPanel] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const isPaused = usePlayerStore((s) => s.isPaused);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const volume = usePlayerStore((s) => s.volume);
  const subtitleTracks = usePlayerStore((s) => s.subtitleTracks);
  const audioTracks = usePlayerStore((s) => s.audioTracks);
  const currentShader = usePlayerStore((s) => s.currentShader);
  const playbackSpeed = usePlayerStore((s) => s.playbackSpeed);

  const togglePause = usePlayerStore((s) => s.togglePause);
  const seekRelative = usePlayerStore((s) => s.seekRelative);
  const setPlaybackSpeed = usePlayerStore((s) => s.setPlaybackSpeed);
  const stop = usePlayerStore((s) => s.stop);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);

  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div className="flex items-center justify-between" data-controls>
      {/* ── Left: Playback controls ── */}
      <div className="flex items-center gap-1">
        {/* Previous episode */}
        <EpisodeNav direction="prev" />

        {/* Rewind 10s */}
        <ControlButton
          onClick={() => seekRelative(-10)}
          title="Rewind 10s (←)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062a1.125 1.125 0 011.683.977v8.123z" />
          </svg>
        </ControlButton>

        {/* Play/Pause */}
        <button
          onClick={togglePause}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          title={isPaused ? "Play (Space)" : "Pause (Space)"}
        >
          {isPaused || !isPlaying ? (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          )}
        </button>

        {/* Forward 10s */}
        <ControlButton
          onClick={() => seekRelative(10)}
          title="Forward 10s (→)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
          </svg>
        </ControlButton>

        {/* Next episode */}
        <EpisodeNav direction="next" />
      </div>

      {/* ── Right: Settings ── */}
      <div className="flex items-center gap-1">
        {/* Volume */}
        <VolumeSlider />

        {/* Playback speed */}
        <div className="relative">
          <ControlButton
            onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSubSelector(false); setShowAudioSelector(false); setShowShaderPanel(false); }}
            title="Playback speed"
            active={playbackSpeed !== 1}
          >
            <span className="text-xs font-mono">{playbackSpeed}x</span>
          </ControlButton>
          {showSpeedMenu && (
            <MenuDropdown>
              <MenuHeader>Speed</MenuHeader>
              {speeds.map((speed) => (
                <MenuItem
                  key={speed}
                  active={playbackSpeed === speed}
                  onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                >
                  {speed}x
                </MenuItem>
              ))}
            </MenuDropdown>
          )}
        </div>

        {/* Subtitle selector */}
        {subtitleTracks.length > 0 && (
          <SubtitleSelector 
            open={showSubSelector} 
            onToggle={() => { setShowSubSelector(!showSubSelector); setShowSpeedMenu(false); setShowAudioSelector(false); setShowShaderPanel(false); }}
          />
        )}

        {/* Audio track selector */}
        {audioTracks.length > 1 && (
          <AudioTrackSelector
            open={showAudioSelector}
            onToggle={() => { setShowAudioSelector(!showAudioSelector); setShowSpeedMenu(false); setShowSubSelector(false); setShowShaderPanel(false); }}
          />
        )}

        {/* Shader toggle */}
        <ControlButton
          onClick={() => { setShowShaderPanel(!showShaderPanel); setShowSubSelector(false); setShowAudioSelector(false); setShowSpeedMenu(false); }}
          title="Video shaders"
          active={currentShader !== null}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </ControlButton>

        {/* Fullscreen */}
        <ControlButton
          onClick={toggleFullscreen}
          title="Toggle fullscreen (F)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </ControlButton>
      </div>

      {/* ── Shader Panel (bottom pop-up) ── */}
      {showShaderPanel && (
        <div className="absolute bottom-full right-6 mb-3">
          <ShaderPanel onClose={() => setShowShaderPanel(false)} />
        </div>
      )}
    </div>
  );
};

// ── Reusable Components ──

const ControlButton: React.FC<{
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, active, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      "w-9 h-9 rounded-lg flex items-center justify-center transition",
      active
        ? "text-accent bg-accent/15 hover:bg-accent/25"
        : "text-white/70 hover:text-white hover:bg-white/10"
    )}
  >
    {children}
  </button>
);

const MenuDropdown: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute bottom-full right-0 mb-2 py-1 min-w-[140px] bg-surface-0/95 backdrop-blur-xl rounded-lg border border-surface-3 shadow-2xl animate-fade-in z-50">
    {children}
  </div>
);

const MenuHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-1.5 text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">
    {children}
  </div>
);

const MenuItem: React.FC<{
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left px-3 py-1.5 text-sm hover:bg-surface-3 transition",
      active ? "text-accent" : "text-text-primary"
    )}
  >
    {children}
  </button>
);