package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "path/filepath"
    "runtime"
    "strings"

    "github.com/google/uuid"
    "github.com/PhamBoy47/media-maestro/internal/database"
    "github.com/PhamBoy47/media-maestro/internal/mpv"
    "github.com/PhamBoy47/media-maestro/internal/music"
    "github.com/PhamBoy47/media-maestro/internal/library"
    "github.com/PhamBoy47/media-maestro/internal/subtitles"
    "github.com/PhamBoy47/media-maestro/internal/torrent"
    wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
    ctx       context.Context
    db        *database.DB
    mpvMgr    *mpv.Manager
    torrent   *torrent.Engine
    subs      *subtitles.Client
    configDir string
}

func NewApp() *App {
    configDir, err := os.UserConfigDir()
    if err != nil {
        configDir = "."
    }
    configDir = filepath.Join(configDir, "media-maestro")

    return &App{
        configDir: configDir,
    }
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx

    // Ensure config directory exists
    os.MkdirAll(a.configDir, 0755)
    os.MkdirAll(filepath.Join(a.configDir, "torrents"), 0755)
    os.MkdirAll(filepath.Join(a.configDir, "subtitles"), 0755)
    os.MkdirAll(filepath.Join(a.configDir, "covers"), 0755)

    // Initialize database
    dbPath := filepath.Join(a.configDir, "maestro.db")
    var err error
    a.db, err = database.New(dbPath)
    if err != nil {
        log.Printf("Failed to initialize database: %v", err)
        return
    }

    // Initialize MPV manager
    a.mpvMgr = mpv.NewManager(a.configDir)
    a.mpvMgr.SetEventCallback(func(eventType string, data interface{}) {
        wailsRuntime.EventsEmit(a.ctx, "mpv:"+eventType, data)
    })

    // Initialize torrent engine
    a.torrent, err = torrent.NewEngine(
        filepath.Join(a.configDir, "torrents"),
        6881, // Torrent listen port
    )
    if err != nil {
        log.Printf("Failed to initialize torrent engine: %v", err)
    }

    // Start torrent streaming server
    go a.torrent.StartStreamServer(9876, func(eventType string, data interface{}) {
        wailsRuntime.EventsEmit(a.ctx, "torrent:"+eventType, data)
    })

    // Initialize subtitle client
    a.subs = subtitles.NewClient(
        os.Getenv("OPENSUBTITLES_API_KEY"),
        filepath.Join(a.configDir, "subtitles"),
    )

    log.Println("Media Maestro initialized successfully")
}

func (a *App) shutdown(ctx context.Context) {
    if a.mpvMgr != nil {
        a.mpvMgr.Shutdown()
    }
    if a.torrent != nil {
        a.torrent.Close()
    }
    if a.db != nil {
        a.db.Close()
    }
}

func (a *App) beforeClose(ctx context.Context) (prevent bool) {
    // Check if playback is active
    if a.mpvMgr != nil && a.mpvMgr.IsPlaying() {
        result, err := wailsRuntime.MessageDialog(a.ctx, wailsRuntime.MessageDialogOptions{
            Type:          wailsRuntime.QuestionDialog,
            Title:         "Quit Media Maestro?",
            Message:       "Media is currently playing. Are you sure you want to quit?",
            Buttons:       []string{"Quit", "Cancel"},
            DefaultButton: "Cancel",
        })
        if err != nil || result == "Cancel" {
            return true
        }
    }
    return false
}

// ══════════════════════════════════════════════════════════
// MPV COMMANDS — Bound to frontend
// ══════════════════════════════════════════════════════════

func (a *App) MpvPlayFile(path string) error {
    err := a.mpvMgr.PlayFile(path)
    if err == nil && a.db != nil {
        a.db.IncrementPlayCount(path)
    }
    return err
}

func (a *App) MpvPlayURL(url string, title string) error {
    return a.mpvMgr.PlayURL(url, title)
}

func (a *App) MpvPlayWithSubs(path string, subPath string) error {
    return a.mpvMgr.PlayWithSubs(path, subPath)
}

func (a *App) MpvTogglePause() error {
    return a.mpvMgr.TogglePause()
}

func (a *App) MpvSeek(seconds float64) error {
    return a.mpvMgr.SeekAbsolute(seconds)
}

func (a *App) MpvSeekRelative(seconds float64) error {
    return a.mpvMgr.SeekRelative(seconds)
}

func (a *App) MpvSetVolume(vol float64) error {
    return a.mpvMgr.SetVolume(vol)
}

func (a *App) MpvStop() error {
    return a.mpvMgr.Stop()
}

func (a *App) MpvSetSubtitleTrack(id int) error {
    return a.mpvMgr.SetProperty("sid", id)
}

func (a *App) MpvSetAudioTrack(id int) error {
    return a.mpvMgr.SetProperty("aid", id)
}


func (a *App) MpvGetTrackList() (interface{}, error) {
    return a.mpvMgr.GetProperty("track-list")
}

func (a *App) MpvGetTimePosition() (float64, error) {
    return a.mpvMgr.GetFloatProperty("time-pos")
}

func (a *App) MpvGetDuration() (float64, error) {
    return a.mpvMgr.GetFloatProperty("duration")
}

func (a *App) MpvScreenshot(filePath string) error {
    return a.mpvMgr.Screenshot(filePath)
}

func (a *App) MpvSetPlaybackSpeed(speed float64) error {
    return a.mpvMgr.SetProperty("speed", speed)
}

func (a *App) MpvAddSubtitle(path string) error {
    return a.mpvMgr.AddSubtitle(path)
}

func (a *App) MpvToggleFullscreen() error {
    return a.mpvMgr.ToggleFullscreen()
}

// ── LIBRARY COMMANDS ──

func (a *App) GetLibraryItems(mediaType string, search string) ([]database.MediaItem, error) {
	return a.db.GetMediaItems(mediaType, search)
}

func (a *App) ScanFolder() ([]database.MediaItem, error) {
	path, err := a.OpenFolderPicker()
	if err != nil || path == "" {
		return nil, err
	}
	
	scanner := library.NewScanner(a.db)
	return scanner.ScanDirectory(path)
}

func (a *App) GetLibraryStats() (database.GlobalStats, error) {
	return a.db.GetStats()
}

func (a *App) GetRecentlyPlayed(limit int) ([]database.MediaItem, error) {
	if limit <= 0 {
		limit = 8
	}
	return a.db.GetRecentlyPlayed(limit)
}

func (a *App) AddVideoFile() (*database.MediaItem, error) {
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select video file",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "Video files (*.mkv;*.mp4;*.avi)", Pattern: "*.mkv;*.mp4;*.avi"},
		},
	})
	if err != nil || path == "" {
		return nil, err
	}

	// Get file info for size
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSuffix(info.Name(), filepath.Ext(info.Name()))
	item := database.MediaItem{
		ID:        uuid.New().String(),
		Title:     title,
		MediaType: "video",
		FilePath:  path,
		FileSize:  info.Size(),
		Metadata:  fmt.Sprintf(`{"file_size":%d}`, info.Size()),
	}

	if err := a.db.SaveMediaItem(item); err != nil {
		log.Printf("Failed to save video file to library: %v", err)
	}

	return &item, nil
}

func (a *App) SaveWatchProgress(mediaPath string, position float64, duration float64) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.SaveWatchProgress(mediaPath, position, duration)
}

func (a *App) GetWatchProgress(mediaPath string) (*database.WatchProgress, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetWatchProgress(mediaPath)
}

// MpvGetMediaInfo returns detailed media info from the currently playing file
func (a *App) MpvGetMediaInfo() (map[string]interface{}, error) {
	info := make(map[string]interface{})

	if a.mpvMgr == nil {
		return info, fmt.Errorf("MPV not initialized")
	}

	// Filename
	if v, err := a.mpvMgr.GetProperty("filename"); err == nil {
		info["filename"] = v
	}
	// Video resolution
	if v, err := a.mpvMgr.GetProperty("video-params/w"); err == nil {
		info["width"] = v
	}
	if v, err := a.mpvMgr.GetProperty("video-params/h"); err == nil {
		info["height"] = v
	}
	// Codecs
	if v, err := a.mpvMgr.GetProperty("video-codec"); err == nil {
		info["videoCodec"] = v
	}
	if v, err := a.mpvMgr.GetProperty("audio-codec-name"); err == nil {
		info["audioCodec"] = v
	}
	// Audio params
	if v, err := a.mpvMgr.GetProperty("audio-params/channel-count"); err == nil {
		info["audioChannels"] = v
	}
	if v, err := a.mpvMgr.GetProperty("audio-params/samplerate"); err == nil {
		info["sampleRate"] = v
	}
	// File size / format
	if v, err := a.mpvMgr.GetProperty("file-size"); err == nil {
		info["fileSize"] = v
	}
	if v, err := a.mpvMgr.GetProperty("video-params/pixelformat"); err == nil {
		info["pixelFormat"] = v
	}
	if v, err := a.mpvMgr.GetFloatProperty("video-bitrate"); err == nil {
		info["videoBitrate"] = v
	}
	if v, err := a.mpvMgr.GetFloatProperty("audio-bitrate"); err == nil {
		info["audioBitrate"] = v
	}

	return info, nil
}

// ══════════════════════════════════════════════════════════
// TORRENT COMMANDS
// ══════════════════════════════════════════════════════════

func (a *App) TorrentAddMagnet(magnetURI string) (*torrent.TorrentInfo, error) {
    return a.torrent.AddMagnet(magnetURI)
}

func (a *App) TorrentAddFile(torrentPath string) (*torrent.TorrentInfo, error) {
    return a.torrent.AddFile(torrentPath)
}

func (a *App) TorrentGetStreamURL(infoHash string, fileIndex int) string {
    return a.torrent.GetStreamURL(infoHash, fileIndex)
}

func (a *App) TorrentGetStatus(infoHash string) (*torrent.TorrentStatus, error) {
    return a.torrent.GetStatus(infoHash)
}

func (a *App) TorrentRemove(infoHash string) error {
    return a.torrent.Remove(infoHash)
}

func (a *App) TorrentList() []*torrent.TorrentInfo {
    return a.torrent.List()
}

// ══════════════════════════════════════════════════════════
// SUBTITLE COMMANDS
// ══════════════════════════════════════════════════════════

func (a *App) SearchSubtitles(query string, language string, season int, episode int) ([]subtitles.SearchResult, error) {
    return a.subs.Search(query, language, season, episode)
}

func (a *App) SearchSubtitlesByFile(filePath string, language string) ([]subtitles.SearchResult, error) {
    return a.subs.SearchByFile(filePath, language)
}

func (a *App) DownloadSubtitle(fileID string, mediaPath string) (string, error) {
    return a.subs.Download(fileID, mediaPath)
}

// ══════════════════════════════════════════════════════════
// MUSIC COMMANDS
// ══════════════════════════════════════════════════════════

func (a *App) MusicPlay(path string) error {
    return a.mpvMgr.PlayFile(path)
}

func (a *App) MusicTogglePause() error {
    return a.mpvMgr.TogglePause()
}

func (a *App) MusicSetVolume(vol float64) error {
    return a.mpvMgr.SetVolume(vol)
}

func (a *App) MusicStop() error {
    return a.mpvMgr.Stop()
}

func (a *App) MusicSeek(position float64) error {
    return a.mpvMgr.SeekAbsolute(position)
}

func (a *App) MusicGetTrackInfo(path string) (*music.TrackInfo, error) {
    return music.ReadTrackInfo(path)
}

func (a *App) MusicScanLibrary(dir string) ([]*music.TrackInfo, error) {
    return music.ScanDirectory(dir)
}

// ══════════════════════════════════════════════════════════
// FILE/DIALOG COMMANDS
// ══════════════════════════════════════════════════════════

func (a *App) OpenFilePicker() (string, error) {
    result, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
        Title: "Select media file",
        Filters: []wailsRuntime.FileFilter{
            {DisplayName: "Video files", Pattern: "*.mkv;*.mp4;*.avi;*.webm;*.hevc;*.flv;*.wmv;*.mov;*.ogm"},
            {DisplayName: "Audio files", Pattern: "*.mp3;*.flac;*.ogg;*.wav;*.aac;*.m4a;*.opus;*.wma"},
            {DisplayName: "All files", Pattern: "*.*"},
        },
    })
    return result, err
}

func (a *App) OpenFolderPicker() (string, error) {
    result, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
        Title: "Select media folder",
    })
    return result, err
}

func (a *App) GetPlatform() string {
    return runtime.GOOS
}

func (a *App) GetConfigDir() string {
    return a.configDir
}