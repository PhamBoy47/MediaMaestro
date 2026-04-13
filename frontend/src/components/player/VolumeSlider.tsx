import React, { useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils';

export const VolumeSlider: React.FC = () => {
  const [showSlider, setShowSlider] = useState(false);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const icon = volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setVolume(Math.max(0, Math.min(100, volume + delta)));
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
      onWheel={handleWheel}
    >
      <button
        onClick={() => setVolume(volume === 0 ? 100 : 0)}
        className="w-9 h-9 rounded
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition"
      >
        <span className="text-sm">{icon}</span>
      </button>

      {/* Expandable volume slider (Seanime style) */}
      <div
        className={cn(
          "flex items-center overflow-hidden transition-all duration-200",
          showSlider ? "w-24 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
        )}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1 appearance-none bg-white/20 rounded-full outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
        />
      </div>
    </div>
  );
};