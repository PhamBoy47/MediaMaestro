import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
import { cn } from '@/lib/utils';

export const SubtitleDisplay: React.FC = () => {
  const [subtitleText, setSubtitleText] = useState<string>('');
  const activeSubtitleTrack = usePlayerStore((s) => s.activeSubtitleTrack);

  useEffect(() => {
    // Listen for subtitle text events from Go backend
    return EventsOn('mpv:sub-text', (data: string) => {
      setSubtitleText(data || '');
    });
  }, []);

  if (!subtitleText || activeSubtitleTrack === null || activeSubtitleTrack <= 0) return null;

  // Parse ASS tags (basic) or just render HTML/Text
  const isMultiLine = subtitleText.includes('\n');

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[85vw]">
      <div className={cn(
        "px-4 py-2 rounded-lg text-center",
        "bg-black/70 backdrop-blur-sm"
      )}>
        <p
          className={cn(
            "text-white font-semibold leading-relaxed drop-shadow-lg",
            isMultiLine ? "text-xl" : "text-2xl"
          )}
          style={{ 
            textShadow: '1px 1px 2px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
          }}
          dangerouslySetInnerHTML={{ 
            __html: subtitleText
              .replace(/\n/g, '<br/>')
              .replace(/{\\i1}(.+?){\\i0}/g, '<i>$1</i>')
              .replace(/{\\b1}(.+?){\\b0}/g, '<strong>$1</strong>')
          }}
        />
      </div>
    </div>
  );
};