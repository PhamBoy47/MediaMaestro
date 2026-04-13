import { create } from 'zustand';
import * as App from '../../wailsjs/go/main/App';

interface TorrentInfo {
  infoHash: string;
  name: string;
  totalSize: number;
  files: { path: string; length: number; index: number; isVideo: boolean }[];
  streamUrl: string;
  state: string;
}

interface TorrentState {
  activeHash: string | null;
  torrents: TorrentInfo[];
  isAdding: boolean;

  addMagnet: (magnet: string) => Promise<TorrentInfo | null>;
  addFile: (path: string) => Promise<TorrentInfo | null>;
  remove: (hash: string) => Promise<void>;
  refreshList: () => Promise<void>;
  playTorrentFile: (hash: string, fileIndex: number) => Promise<void>;
}

export const useTorrentStore = create<TorrentState>()((set, get) => ({
  activeHash: null,
  torrents: [],
  isAdding: false,

  addMagnet: async (magnet) => {
    set({ isAdding: true });
    try {
      const info = await App.TorrentAddMagnet(magnet);
      if (info) {
        set((s) => ({ 
          torrents: [...s.torrents, info],
          activeHash: info.infoHash 
        }));
      }
      return info;
    } catch (e) {
      console.error('Failed to add magnet:', e);
      return null;
    } finally {
      set({ isAdding: false });
    }
  },

  addFile: async (path) => {
    set({ isAdding: true });
    try {
      const info = await App.TorrentAddFile(path);
      if (info) {
        set((s) => ({ 
          torrents: [...s.torrents, info],
          activeHash: info.infoHash 
        }));
      }
      return info;
    } catch (e) {
      console.error('Failed to add torrent file:', e);
      return null;
    } finally {
      set({ isAdding: false });
    }
  },

  remove: async (hash) => {
    await App.TorrentRemove(hash);
    set((s) => ({
      torrents: s.torrents.filter((t) => t.infoHash !== hash),
      activeHash: s.activeHash === hash ? null : s.activeHash,
    }));
  },

  refreshList: async () => {
    const list = await App.TorrentList();
    set({ torrents: list || [] });
  },

  playTorrentFile: async (hash, fileIndex) => {
    const url = App.TorrentGetStreamURL(hash, fileIndex);
    const info = get().torrents.find((t) => t.infoHash === hash);
    const file = info?.files[fileIndex];
    
    set({ activeHash: hash });
    
    await usePlayerStore.getState().playStream(
      url, 
      file?.path || info?.name || 'Torrent Stream'
    );
  },
}));