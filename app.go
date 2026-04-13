package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"

    "github.com/PhamBoy47/media-maestro/internal/database"
    "github.com/PhamBoy47/media-maestro/internal/mpv"
    "github.com/PhamBoy47/media-maestro/internal/music"
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
    musicP    *music.Player
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
    os.MkdirAll(filepath.Join(a.configDir, "shaders"), 0755)
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

    // Initialize music player
    a.musicP = music.NewPlayer(func(eventType string, data interface{}) {
        wailsRuntime.EventsEmit(a.ctx, "music:"+eventType, data)
    })

    log.Println("Media Maestro initialized successfully")
}

func (a *App) shutdown(ctx context.Context) {
    if a.mpvMgr != nil {
        a.mpvMgr.Shutdown()
    }
    if a.torrent != nil {
        a.torrent.Close()
    }
    if a.musicP != nil {
        a.musicP.Stop()
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
    return a.mpvMgr.PlayFile(path)
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

func (a *App) MpvLoadShader(shaderPath string) error {
    return a.mpvMgr.LoadShader(shaderPath)
}

func (a *App) MpvClearShaders() error {
    return a.mpvMgr.ClearShaders()
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
    return a.musicP.Play(path)
}

func (a *App) MusicTogglePause() error {
    return a.musicP.TogglePause()
}

func (a *App) MusicSetVolume(vol float64) error {
    return a.musicP.SetVolume(vol)
}

func (a *App) MusicStop() error {
    return a.musicP.Stop()
}

func (a *App) MusicSeek(position float64) error {
    return a.musicP.Seek(position)
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

// findMPVBinary locates the MPV executable on the system
func findMPVBinary() (string, error) {
    // Check common locations first
    candidates := []string{}

    switch runtime.GOOS {
    case "windows":
        candidates = []string{
            `C:\Program Files\mpv\mpv.exe`,
            `C:\Program Files (x86)\mpv\mpv.exe`,
            filepath.Join(os.Getenv("LOCALAPPDATA"), `Microsoft\WinGet\Links\mpv.exe`),
        }
    case "darwin":
        candidates = []string{
            "/opt/homebrew/bin/mpv",
            "/usr/local/bin/mpv",
            "/Applications/mpv.app/Contents/MacOS/mpv",
        }
    case "linux":
        candidates = []string{
            "/usr/bin/mpv",
            "/usr/local/bin/mpv",
            "/snap/bin/mpv",
            "/bin/mpv",
        }
    }

    for _, path := range candidates {
        if _, err := os.Stat(path); err == nil {
            return path, nil
        }
    }

    // Fallback: check PATH
    path, err := exec.LookPath("mpv")
    if err != nil {
        return "", fmt.Errorf("MPV not found. Install MPV and add it to your PATH")
    }
    return path, nil
}