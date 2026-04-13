import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import * as App from '../../../wailsjs/go/main/App';
import { NowPlaying } from './NowPlaying';
import { cn } from '@/lib/utils';

type TabView = 'albums' | 'artists' | 'tracks' | 'playlists';

interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSecs: number;
  filePath: string;
  coverPath: string;
  trackNumber: number;
  genre: string;
  year: number;
}

export const MusicLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('albums');
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const tabs: { key: TabView; label: string }[] = [
    { key: 'albums', label: 'Albums' },
    { key: 'artists', label: 'Artists' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'playlists', label: 'Playlists' },
  ];

  // Group tracks by album for the Albums view
  const albums = React.useMemo(() => {
    const map = new Map<string, { album: string; artist: string; coverPath?: string; tracks: TrackInfo[] }>();
    for (const track of tracks) {
      const key = `${track.album}-${track.artist}`;
      if (!map.has(key)) {
        map.set(key, { album: track.album, artist: track.artist, coverPath: track.coverPath || undefined, tracks: [] });
      }
      map.get(key)!.tracks.push(track);
    }
    return Array.from(map.values());
  }, [tracks]);

  const handlePlayTrack = (track: TrackInfo) => {
    setQueue(tracks);
    playTrack(track);
  };

  const handlePlayAlbum = (albumTracks: TrackInfo[]) => {
    setQueue(albumTracks);
    if (albumTracks.length > 0) playTrack(albumTracks[0]);
  };

  const handleScan = async () => {
    setIsLoading(true);
    try {
      const folder = await App.OpenFolderPicker();
      if (folder) {
        const scannedTracks = await App.MusicScanLibrary(folder);
        setTracks(scannedTracks || []);
      }
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* ── Main Library Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <div className="flex items-center gap-4">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "text-sm font-medium pb-1.5 border-b-2 transition",
                  activeTab === key
                    ? "text-accent border-accent"
                    : "text-text-secondary border-transparent hover:text-text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-2 text-text-primary text-sm px-3 py-1.5 rounded-lg border border-surface-3 focus:border-accent focus:outline-none w-56"
            />
            <button
              onClick={handleScan}
              disabled={isLoading}
              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? 'Scanning...' : 'Add Folder'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <span className="text-5xl mb-4">♪</span>
              <p className="text-sm">No music library found</p>
              <p className="text-xs mt-1">Click "Add Folder" to scan your music collection</p>
            </div>
          ) : (
            <>
              {activeTab === 'albums' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {albums.map((album) => (
                    <button
                      key={`${album.album}-${album.artist}`}
                      onClick={() => handlePlayAlbum(album.tracks)}
                      className="group text-left"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-2 mb-3 shadow-sm group-hover:shadow-lg transition-shadow">
                        {album.coverPath ? (
                          <img src={album.coverPath} alt={album.album} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-tertiary text-4xl bg-surface-3">♪</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-xl">
                            <span className="text-white text-xl ml-0.5">▶</span>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-text-primary truncate">{album.album}</h3>
                      <p className="text-xs text-text-secondary truncate">{album.artist} · {album.tracks.length} tracks</p>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'tracks' && (
                <div className="space-y-0.5">
                  {tracks.map((track, idx) => (
                    <button
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition group",
                        currentTrack?.id === track.id ? "bg-accent/10 text-accent" : "hover:bg-surface-3 text-text-primary"
                      )}
                    >
                      <span className="text-xs text-text-tertiary w-6 text-right tabular-nums">{idx + 1}</span>
                      {track.coverPath ? (
                        <img src={track.coverPath} alt="" className="w-9 h-9 rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-surface-3 flex items-center justify-center text-text-tertiary text-xs">♪</div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm truncate">{track.title}</p>
                        <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                      </div>
                      <span className="text-xs text-text-tertiary tabular-nums">
                        {Math.floor(track.durationSecs / 60)}:{Math.floor(track.durationSecs % 60).toString().padStart(2, '0')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Now Playing Sidebar (Harmonoid-style) ── */}
      {currentTrack && (
        <div className="w-80 flex-shrink-0 border-l border-surface-3 bg-surface-1">
          <NowPlaying />
        </div>
      )}
    </div>
  );
};