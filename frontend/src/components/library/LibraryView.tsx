import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { usePlayerStore } from '@/stores/player-store';
import * as App from '../../../wailsjs/go/main/App';
import { 
  Search, Grid, List, SortAsc, 
  RotateCw, Plus, Video, Music, 
  Filter, LayoutGrid, LayoutList,
  Clock, HardDrive, FileText
} from 'lucide-react';
import { MediaCard } from './MediaCard';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const LibraryView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [watchProgress, setWatchProgress] = useState<Record<string, any>>({});
  const [statsData, setStatsData] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const layout = useUIStore((s) => s.libraryLayout);
  const libraryFilter = useUIStore((s) => s.libraryFilter);
  const setLayout = useUIStore((s) => s.setLibraryLayout);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const playFile = usePlayerStore((s) => s.playFile);

  const fetchLibrary = async () => {
    // Guard: Wails runtime injects window.go asynchronously in dev mode.
    if (!(window as any).go) return;
    try {
      const results = await App.GetLibraryItems(libraryFilter, search);
      setItems(results || []);
      
      if (!search && libraryFilter === 'all') {
        const recent = await App.GetRecentlyPlayed(8);
        setRecentItems(recent || []);
      } else {
        setRecentItems([]);
      }

      const stats = await App.GetLibraryStats();
      setStatsData(stats);

      // Fetch progress for all video items to show resume bar
      // We could do a batch fetch, but for now we'll just fetch for recents to save overhead
    } catch (e) {
      console.warn("Library fetch deferred (bindings not ready):", e);
    }
  };

  useEffect(() => {
    const fetchProgress = async () => {
      if (recentItems.length === 0) return;
      const progressMap: Record<string, any> = {};
      for (const item of recentItems) {
        if (item.media_type === 'video') {
           try {
             const wp = await App.GetWatchProgress(item.file_path);
             if (wp) progressMap[item.file_path] = wp;
           } catch (e) {}
        }
      }
      setWatchProgress(progressMap);
    };
    fetchProgress();
  }, [recentItems]);

  useEffect(() => {
    // Immediately attempt, then poll until window.go is injected
    fetchLibrary();
    const interval = setInterval(() => {
      if ((window as any).go) {
        fetchLibrary();
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [libraryFilter, search]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await App.ScanFolder();
      await fetchLibrary();
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenVideo = async () => {
    try {
      const item = await App.AddVideoFile();
      if (item) {
        setViewMode('video');
        await playFile(item.file_path);
        fetchLibrary(); // refresh library in background
      }
    } catch (e) {
      console.error("Failed to open video:", e);
    }
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return undefined;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return undefined;
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const stats = [
    { label: 'Total Files', value: statsData?.total_files || '0', icon: FileText, color: 'text-blue-400' },
    { label: 'Videos', value: statsData?.videos || '0', icon: Video, color: 'text-purple-400' },
    { label: 'Audio', value: statsData?.audio || '0', icon: Music, color: 'text-pink-400' },
    { label: 'Total Size', value: statsData?.total_size || '0 GB', icon: HardDrive, color: 'text-emerald-400' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-0">
      {/* Header / Stats Overlay */}
      <div className="relative p-8 pb-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Media Library</h1>
            <p className="text-white/40 text-sm">Manage and play your local collection</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchLibrary}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm font-medium text-white/70 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCw size={18} className={cn(isScanning && "animate-spin")} />
              Sync Library
            </button>
            <button 
              onClick={handleOpenVideo}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm font-medium text-white/70 transition-all active:scale-95"
            >
              <Video size={18} />
              Open File
            </button>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 rounded-xl text-sm font-bold text-white shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Plus size={18} />
              Add Folder
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl bg-surface-1/50 border border-white/5 backdrop-blur-sm flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-white/5", stat.color)}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-white/40">{stat.label}</div>
                <div className="text-xl font-bold text-white/90">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 px-8 py-4 bg-surface-0/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white/80">
               {libraryFilter === 'video' ? 'Videos' : libraryFilter === 'audio' ? 'Audio' : 'All Media'}
            </h1>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text"
              placeholder="Search library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <button 
              onClick={() => setLayout('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                layout === 'grid' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setLayout('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                layout === 'list' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
              )}
            >
              <LayoutList size={18} />
            </button>
          </div>
          
          <button className="p-2 text-white/40 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
          <button className="p-2 text-white/40 hover:text-white transition-colors">
            <SortAsc size={20} />
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-6 hide-scrollbar">
        {recentItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Recently Played</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {recentItems.map(item => {
                const wp = watchProgress[item.file_path];
                const progress = wp && wp.duration > 0 ? wp.position / wp.duration : 0;
                return (
                  <div key={`recent-${item.id}`} className="w-64 flex-shrink-0 snap-start">
                    <MediaCard
                      title={item.title}
                      subtitle={item.media_type === 'video' ? 'Video' : item.artist || 'Audio'}
                      cover={item.cover_path}
                      mediaType={item.media_type}
                      duration={formatDuration(item.duration)}
                      size={formatSize(item.file_size)}
                      progress={progress}
                      onClick={async () => {
                        if (item.media_type === 'video') {
                          setViewMode('video');
                          await playFile(item.file_path);
                        } else {
                          setViewMode('video');
                          usePlayerStore.getState().playTrack({
                            id: item.id,
                            title: item.title,
                            artist: item.artist || 'Unknown Artist',
                            album: item.album || 'Unknown Album',
                            filePath: item.file_path,
                            coverPath: item.cover_path,
                            durationSecs: item.duration || 0,
                          });
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-white/20" />
             </div>
             <h3 className="text-xl font-medium text-white/60">Library is empty</h3>
             <p className="text-sm text-white/40 mt-1">Add a folder or drag files here to begin</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">All Media</h2>
            <div className={cn(
              "grid gap-6",
              layout === 'grid' 
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" 
                : "grid-cols-1"
            )}>
              {items.map((item) => (
                <MediaCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.media_type === 'video' ? 'Video' : item.artist || 'Audio'}
                  cover={item.cover_path}
                  mediaType={item.media_type}
                  duration={formatDuration(item.duration)}
                  size={formatSize(item.file_size)}
                  onClick={async () => {
                      if (item.media_type === 'video') {
                        setViewMode('video');
                        await playFile(item.file_path);
                      } else {
                        const track = {
                          id: item.id,
                          title: item.title,
                          artist: item.artist || 'Unknown Artist',
                          album: item.album || 'Unknown Album',
                          filePath: item.file_path,
                          coverPath: item.cover_path,
                          durationSecs: item.duration || 0,
                        };
                        setViewMode('video');
                        usePlayerStore.getState().playTrack(track);
                      }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
