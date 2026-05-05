import { create } from 'zustand';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import * as App from '../../wailsjs/go/main/App';

type PlaybackMode = 'idle' | 'video' | 'music';
type RepeatMode = 'off' | 'all' | 'one';

interface SubtitleTrack {
  id: number;
  lang: string;
  title: string;
  codec: string;
  external: boolean;
  default: boolean;
}

interface AudioTrack {
  id: number;
  lang: string;
  title: string;
  codec: string;
  default: boolean;
}

interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSecs: number;
  filePath: string;
  coverPath?: string;
  trackNumber?: number;
  genre?: string;
  year?: number;
}

interface MediaInfo {
  filename?: string;
  width?: number;
  height?: number;
  videoCodec?: string;
  audioCodec?: string;
  audioChannels?: number;
  sampleRate?: number;
  fileSize?: number;
  pixelFormat?: string;
  videoBitrate?: number;
  audioBitrate?: number;
}

interface PlayerState {
  // Mode
  mode: PlaybackMode;
  
  // Shared playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  
  // Video state
  videoSource: string | null;
  videoTitle: string | null;
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrack[];
  activeSubtitleTrack: number | null;
  activeAudioTrack: number | null;
  isBuffering: boolean;
  mediaInfo: MediaInfo;
  showStats: boolean;
  
  // Music state
  currentTrack: TrackInfo | null;
  queue: TrackInfo[];
  queueIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;

  // Actions — Video
  playFile: (path: string) => Promise<void>;
  playStream: (url: string, title: string) => Promise<void>;
  playWithSubs: (path: string, subPath: string) => Promise<void>;
  togglePause: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  seekRelative: (seconds: number) => Promise<void>;
  setVolume: (vol: number) => Promise<void>;
  stop: () => Promise<void>;
  setSubtitleTrack: (id: number) => Promise<void>;
  setAudioTrack: (id: number) => Promise<void>;
  addSubtitle: (path: string) => Promise<void>;
  setPlaybackSpeed: (speed: number) => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  refreshTrackList: () => Promise<void>;
  refreshMediaInfo: () => Promise<void>;
  toggleStats: () => void;

  // Actions — Music
  playTrack: (track: TrackInfo) => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  setQueue: (tracks: TrackInfo[]) => void;
  setRepeat: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
}

let mpvListenerInitialized = false;
let progressSaveInterval: ReturnType<typeof setInterval> | null = null;

function startProgressSaver() {
  if (progressSaveInterval) return;
  progressSaveInterval = setInterval(() => {
    const state = usePlayerStore.getState();
    if (state.isPlaying && state.videoSource && state.currentTime > 0 && state.duration > 0) {
      App.SaveWatchProgress(state.videoSource, state.currentTime, state.duration).catch(() => {});
    }
  }, 10000); // Save every 10 seconds
}

function stopProgressSaver() {
  if (progressSaveInterval) {
    clearInterval(progressSaveInterval);
    progressSaveInterval = null;
  }
}

function initMpvListeners() {
  if (mpvListenerInitialized) return;
  mpvListenerInitialized = true;

  EventsOn('mpv:time-pos', (data: number) => {
    usePlayerStore.setState({ currentTime: data });
  });

  EventsOn('mpv:duration', (data: number) => {
    usePlayerStore.setState({ duration: data });
  });

  EventsOn('mpv:pause', (data: boolean) => {
    usePlayerStore.setState({ isPaused: data, isPlaying: !data });
  });

  EventsOn('mpv:volume', (data: number) => {
    usePlayerStore.setState({ volume: data });
  });

  EventsOn('mpv:ended', () => {
    const state = usePlayerStore.getState();
    // Save final progress
    if (state.videoSource && state.duration > 0) {
      App.SaveWatchProgress(state.videoSource, state.currentTime, state.duration).catch(() => {});
    }
    stopProgressSaver();
    if (state.mode === 'music') {
      state.nextTrack();
    } else {
      usePlayerStore.setState({ isPlaying: false, isPaused: false });
    }
  });

  EventsOn('mpv:file-loaded', () => {
    usePlayerStore.getState().refreshTrackList();
    usePlayerStore.getState().refreshMediaInfo();
    startProgressSaver();
  });

  EventsOn('mpv:track-list', (data: any) => {
    parseTrackList(data);
  });

  EventsOn('mpv:cache-pause', (data: boolean) => {
    usePlayerStore.setState({ isBuffering: data });
  });

  EventsOn('mpv:buffer', (_data: any) => {
    // Buffer state for torrent streaming
  });

  // Torrent events
  EventsOn('torrent:added', (_data: string) => {
    // Update torrent list
  });
}

function parseTrackList(data: any) {
  if (!data || !Array.isArray(data)) return;

  const subs: SubtitleTrack[] = [];
  const audio: AudioTrack[] = [];

  for (const track of data) {
    if (track.type === 'sub') {
      subs.push({
        id: track.id,
        lang: track.lang || 'unknown',
        title: track.title || 'Unknown',
        codec: track.codec || '',
        external: track.external || false,
        default: track.default || false,
      });
    } else if (track.type === 'audio') {
      audio.push({
        id: track.id,
        lang: track.lang || 'unknown',
        title: track.title || 'Unknown',
        codec: track.codec || '',
        default: track.default || false,
      });
    }
  }

  usePlayerStore.setState({ 
    subtitleTracks: subs, 
    audioTracks: audio,
    activeSubtitleTrack: subs.find(s => s.default)?.id ?? subs[0]?.id ?? null,
    activeAudioTrack: audio.find(a => a.default)?.id ?? audio[0]?.id ?? null,
  });
}

export const usePlayerStore = create<PlayerState>()((set, get) => {
  // Initialize Wails event listeners on store creation
  setTimeout(() => initMpvListeners(), 0);

  return {
    // Initial state
    mode: 'idle',
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    playbackSpeed: 1,
    videoSource: null,
    videoTitle: null,
    subtitleTracks: [],
    audioTracks: [],
    activeSubtitleTrack: null,
    activeAudioTrack: null,
    isBuffering: false,
    mediaInfo: {},
    showStats: false,
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    repeat: 'off',
    shuffle: false,

    // ── Video Actions ──

    playFile: async (path) => {
      // Check for saved progress to resume
      try {
        const progress = await App.GetWatchProgress(path);
        await App.MpvPlayFile(path);
        set({ mode: 'video', isPlaying: true, isPaused: false, videoSource: path, mediaInfo: {} });
        // Resume from saved position if not completed and > 5s in
        if (progress && !progress.completed && progress.position > 5) {
          // Small delay to let MPV load the file
          setTimeout(async () => {
            try { await App.MpvSeek(progress.position); } catch {}
          }, 500);
        }
      } catch {
        await App.MpvPlayFile(path);
        set({ mode: 'video', isPlaying: true, isPaused: false, videoSource: path, mediaInfo: {} });
      }
    },

    playStream: async (url, title) => {
      await App.MpvPlayURL(url, title);
      set({ mode: 'video', isPlaying: true, isPaused: false, videoSource: url, videoTitle: title, mediaInfo: {} });
    },

    playWithSubs: async (path, subPath) => {
      await App.MpvPlayWithSubs(path, subPath);
      set({ mode: 'video', isPlaying: true, isPaused: false, videoSource: path, mediaInfo: {} });
    },

    togglePause: async () => {
      await App.MpvTogglePause();
    },

    seek: async (seconds) => {
      await App.MpvSeek(seconds);
    },

    seekRelative: async (seconds) => {
      await App.MpvSeekRelative(seconds);
    },

    setVolume: async (vol) => {
      await App.MpvSetVolume(vol);
      set({ volume: vol });
    },

    stop: async () => {
      // Save progress before stopping
      const { videoSource, currentTime, duration } = get();
      if (videoSource && currentTime > 0 && duration > 0) {
        App.SaveWatchProgress(videoSource, currentTime, duration).catch(() => {});
      }
      stopProgressSaver();
      await App.MpvStop();
      set({ 
        mode: 'idle', isPlaying: false, isPaused: false, 
        currentTime: 0, duration: 0, videoSource: null, 
        videoTitle: null, currentTrack: null, mediaInfo: {},
        showStats: false,
      });
    },

    setSubtitleTrack: async (id) => {
      await App.MpvSetSubtitleTrack(id);
      set({ activeSubtitleTrack: id });
    },

    setAudioTrack: async (id) => {
      await App.MpvSetAudioTrack(id);
      set({ activeAudioTrack: id });
    },

    addSubtitle: async (path) => {
      await App.MpvAddSubtitle(path);
    },

    setPlaybackSpeed: async (speed) => {
      await App.MpvSetPlaybackSpeed(speed);
      set({ playbackSpeed: speed });
    },

    toggleFullscreen: async () => {
      await App.MpvToggleFullscreen();
    },

    refreshTrackList: async () => {
      try {
        const tracks = await App.MpvGetTrackList();
        parseTrackList(tracks);
      } catch (e) {
        console.error('Failed to refresh track list:', e);
      }
    },

    refreshMediaInfo: async () => {
      try {
        const info = await App.MpvGetMediaInfo();
        if (info) {
          set({ mediaInfo: info as MediaInfo });
        }
      } catch (e) {
        console.warn('Failed to fetch media info:', e);
      }
    },

    toggleStats: () => {
      set((s) => ({ showStats: !s.showStats }));
    },

    // ── Music Actions ──

    playTrack: async (track) => {
      await App.MusicPlay(track.filePath);
      set({ 
        mode: 'music', isPlaying: true, isPaused: false, 
        currentTrack: track, videoSource: null 
      });
    },

    nextTrack: async () => {
      const { queue, queueIndex, repeat, shuffle } = get();
      if (queue.length === 0) return;

      let nextIdx: number;
      if (shuffle) {
        nextIdx = Math.floor(Math.random() * queue.length);
      } else if (repeat === 'one') {
        nextIdx = queueIndex;
      } else {
        nextIdx = queueIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeat === 'all') nextIdx = 0;
          else { set({ isPlaying: false }); return; }
        }
      }

      const track = queue[nextIdx];
      set({ queueIndex: nextIdx });
      await get().playTrack(track);
    },

    prevTrack: async () => {
      const { queue, queueIndex, currentTime } = get();
      if (currentTime > 3) {
        await get().seek(0);
        return;
      }
      if (queue.length === 0) return;
      const prevIdx = Math.max(0, queueIndex - 1);
      set({ queueIndex: prevIdx });
      await get().playTrack(queue[prevIdx]);
    },

    setQueue: (tracks) => set({ queue: tracks, queueIndex: 0 }),
    setRepeat: (mode) => set({ repeat: mode }),
    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  };
});