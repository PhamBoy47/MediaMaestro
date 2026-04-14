import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { 
  Home, Video, Music, Clock, 
  Star, Folder, Download, Search,
  Settings, ChevronRight, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MediaSidebar: React.FC = () => {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const menuItems = [
    { id: 'library', label: 'Home', icon: Home },
    { id: 'videos', label: 'All Videos', icon: Video },
    { id: 'music_lib', label: 'All Music', icon: Music },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  const collections = [
    { label: 'Favorites', icon: Star, color: 'text-amber-400' },
    { label: 'Downloads', icon: Download, color: 'text-blue-400' },
    { label: 'Unwatched', icon: Hash, color: 'text-purple-400' },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden hide-scrollbar">
      {/* Quick Access */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-2">Quick Access</h3>
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id === 'music_lib' ? 'music' : 'library')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                (viewMode === item.id || (viewMode === 'library' && item.id === 'library'))
                  ? "bg-accent/10 text-accent" 
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <item.icon size={18} className="transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Collections */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-2">Collections</h3>
        <div className="space-y-1">
          {collections.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/80 transition-all group"
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={cn("transition-transform group-hover:scale-110", item.color)} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="mb-8">
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-2">Folders</h3>
        <div className="px-3 py-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center gap-2">
            <Folder size={24} className="text-white/20" />
            <p className="text-[10px] text-white/30 font-medium">No monitored folders yet</p>
            <button className="text-[10px] text-accent hover:underline font-bold mt-1">Add Folder</button>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <button 
           onClick={() => setViewMode('settings')}
           className={cn(
             "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
             viewMode === 'settings' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
           )}
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};
