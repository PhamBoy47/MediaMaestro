import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'library' | 'video' | 'music' | 'settings' | 'torrents';
type LibraryLayout = 'grid' | 'list';
type LibraryFilter = 'all' | 'video' | 'audio';

interface UIState {
  viewMode: ViewMode;
  sidebarOpen: boolean;
  accentColor: string;
  libraryLayout: LibraryLayout;
  libraryFilter: LibraryFilter;
  
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setAccentColor: (color: string) => void;
  setLibraryLayout: (layout: LibraryLayout) => void;
  setLibraryFilter: (filter: LibraryFilter) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'library',
      sidebarOpen: true,
      accentColor: '#3b82f6', // Default blue-500
      libraryLayout: 'grid',
      libraryFilter: 'all',

      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setAccentColor: (color) => {
        set({ accentColor: color });
        document.documentElement.style.setProperty('--accent', color);
      },
      setLibraryLayout: (layout) => set({ libraryLayout: layout }),
      setLibraryFilter: (filter) => set({ libraryFilter: filter }),
    }),
    {
      name: 'maestro-ui-storage',
    }
  )
);
