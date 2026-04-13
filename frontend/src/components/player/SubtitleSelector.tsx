import React, { useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import * as App from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';

interface SubtitleSelectorProps {
  open: boolean;
  onToggle: () => void;
}

export const SubtitleSelector: React.FC<SubtitleSelectorProps> = ({ open, onToggle }) => {
  const subtitleTracks = usePlayerStore((s) => s.subtitleTracks);
  const activeSubtitleTrack = usePlayerStore((s) => s.activeSubtitleTrack);
  const setSubtitleTrack = usePlayerStore((s) => s.setSubtitleTrack);
  const addSubtitle = usePlayerStore((s) => s.addSubtitle);
  const videoSource = usePlayerStore((s) => s.videoSource);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLang, setSearchLang] = useState('en');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await App.SearchSubtitles(searchQuery, searchLang, 0, 0);
      setSearchResults(results || []);
    } catch (e) {
      console.error('Subtitle search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    if (!videoSource) return;
    setIsDownloading(fileId);
    try {
      const subPath = await App.DownloadSubtitle(fileId, videoSource);
      await addSubtitle(subPath);
    } catch (e) {
      console.error('Subtitle download failed:', e);
    } finally {
      setIsDownloading(null);
    }
  };

  const hasActiveSub = activeSubtitleTrack !== null && activeSubtitleTrack > 0;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition",
          hasActiveSub
            ? "text-accent bg-accent/15 hover:bg-accent/25"
            : "text-white/70 hover:text-white hover:bg-white/10"
        )}
        title="Subtitles (V)"
      >
        CC
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-surface-0/95 backdrop-blur-xl rounded-xl border border-surface-3 shadow-2xl animate-scale-in z-50 flex flex-col max-h-[400px]">
          {/* Header */}
          <div className="px-3 py-2 border-b border-surface-3">
            <h3 className="text-xs font-semibold text-text-primary">Subtitles</h3>
          </div>

          {/* Track list */}
          <div className="overflow-y-auto flex-1">
            <button
              onClick={() => { setSubtitleTrack(-1); onToggle(); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition",
                activeSubtitleTrack === null && "text-accent"
              )}
            >
              None
            </button>
            {subtitleTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => { setSubtitleTrack(track.id); onToggle(); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition flex items-center justify-between",
                  activeSubtitleTrack === track.id && "text-accent"
                )}
              >
                <span className="truncate">{track.title} ({track.lang})</span>
                {track.external && <span className="text-[10px] text-text-tertiary ml-2">EXT</span>}
              </button>
            ))}
          </div>

          {/* Search online */}
          <div className="border-t border-surface-3 p-3 space-y-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Search OpenSubtitles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-surface-2 text-text-primary text-xs px-2 py-1.5 rounded-md border border-surface-3 focus:border-accent focus:outline-none"
              />
              <select
                value={searchLang}
                onChange={(e) => setSearchLang(e.target.value)}
                className="bg-surface-2 text-text-primary text-xs px-1.5 py-1 rounded-md border border-surface-3 focus:border-accent focus:outline-none"
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="fr">FR</option>
                <option value="ja">JA</option>
              </select>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded-md transition disabled:opacity-50"
              >
                {isSearching ? '...' : 'Find'}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleDownload(result.fileId, result.fileName)}
                    disabled={isDownloading === result.fileId}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-3 transition disabled:opacity-50"
                  >
                    <p className="text-[11px] text-text-primary truncate">{result.fileName}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-text-tertiary">{result.language}</span>
                      <span className="text-[10px] text-text-tertiary">↓{result.downloadCount}</span>
                      {result.hearingImpaired && <span className="text-[10px] text-accent">CC</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};