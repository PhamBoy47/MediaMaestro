import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'library' | 'video' | 'music' | 'settings' | 'torrents';
type LibraryLayout = 'grid' | 'list';

interface UIState {
  viewMode: ViewMode;
  sidebarOpen: boolean;
  accentColor: string;
  libraryLayout: LibraryLayout;
  
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setAccentColor: (color: string) => void;
  setLibraryLayout: (layout: LibraryLayout) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'library',
      sidebarOpen: true,
      accentColor: '#3b82f6', // Default blue-500
      libraryLayout: 'grid',

      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setAccentColor: (color) => {
        set({ accentColor: color });
        document.documentElement.style.setProperty('--accent', color);
      },
      setLibraryLayout: (layout) => set({ libraryLayout: layout }),
    }),
    {
      name: 'maestro-ui-storage',
    }
  )
);
