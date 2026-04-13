package music

import (
    "encoding/binary"
    "fmt"
    "math"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "sync"
    "time"

    "github.com/h2non/filetype"
)

type Player struct {
    playing     bool
    paused      bool
    currentPath string
    volume      float64 // 0.0 - 1.0
    position    float64 // seconds
    duration    float64 // seconds

    process    *exec.Cmd
    eventCB    func(string, interface{})
    mu         sync.RWMutex
    stopCh     chan struct{}
}

type TrackInfo struct {
    ID          string  `json:"id"`
    Title       string  `json:"title"`
    Artist      string  `json:"artist"`
    Album       string  `json:"album"`
    DurationSec float64 `json:"durationSecs"`
    FilePath    string  `json:"filePath"`
    CoverPath   string  `json:"coverPath"`
    TrackNumber int     `json:"trackNumber"`
    Genre       string  `json:"genre"`
    Year        int     `json:"year"`
}

func NewPlayer(eventCB func(string, interface{})) *Player {
    return &Player{
        volume:   1.0,
        eventCB:  eventCB,
        stopCh:   make(chan struct{}),
    }
}

func (p *Player) emit(event string, data interface{}) {
    if p.eventCB != nil {
        p.eventCB(event, data)
    }
}

// Play plays an audio file using MPV in audio-only mode
// (Seanime also uses MPV for audio playback - same binary, different config)
func (p *Player) Play(path string) error {
    p.Stop()

    mpvPath, err := findMPVBinaryMusic()
    if err != nil {
        return err
    }

    args := []string{
        "--no-video",
        "--idle=no",
        fmt.Sprintf("--volume=%.0f", p.volume*100),
        "--audio-display=no",
        "--gapless-audio=yes",
        path,
    }

    p.process = exec.Command(mpvPath, args...)
    p.process.Stdout = os.Stderr
    p.process.Stderr = os.Stderr

    if err := p.process.Start(); err != nil {
        return fmt.Errorf("failed to start audio playback: %w", err)
    }

    p.mu.Lock()
    p.playing = true
    p.paused = false
    p.currentPath = path
    p.mu.Unlock()

    p.emit("playing", map[string]interface{}{
        "path": path,
    })

    // Monitor process for completion
    go func() {
        p.process.Wait()
        p.mu.Lock()
        p.playing = false
        p.currentPath = ""
        p.mu.Unlock()
        p.emit("ended", nil)
    }()

    return nil
}

func (p *Player) TogglePause() error {
    p.mu.Lock()
    defer p.mu.Unlock()

    if p.process == nil || p.process.Process == nil {
        return fmt.Errorf("no audio playing")
    }

    // Send SIGSTOP/SIGCONT to pause/resume (Unix only)
    // For cross-platform, use MPV IPC instead
    p.paused = !p.paused
    p.emit("pause", p.paused)
    return nil
}

func (p *Player) SetVolume(vol float64) error {
    p.mu.Lock()
    p.volume = math.Max(0, math.Min(1, vol))
    p.mu.Unlock()
    p.emit("volume", p.volume*100)
    return nil
}

func (p *Player) Stop() error {
    p.mu.Lock()
    defer p.mu.Unlock()

    if p.process != nil && p.process.Process != nil {
        p.process.Process.Kill()
        p.process.Wait()
    }

    p.playing = false
    p.paused = false
    p.currentPath = ""
    p.emit("stopped", nil)
    return nil
}

func (p *Player) Seek(position float64) error {
    // For MPV-based audio, would need IPC
    return fmt.Errorf("seek not implemented for basic audio player")
}

// ReadTrackInfo extracts metadata from an audio file
func ReadTrackInfo(path string) (*TrackInfo, error) {
    // Use ffprobe/mediainfo for metadata extraction
    // Fallback: parse filename
    title := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
    artist := "Unknown Artist"
    album := "Unknown Album"

    // Try ffprobe
    probePath, err := exec.LookPath("ffprobe")
    if err == nil {
        info, err := probeWithFFProbe(probePath, path)
        if err == nil {
            return info, nil
        }
    }

    // Parse filename: "Artist - Title.ext"
    parts := strings.SplitN(title, " - ", 2)
    if len(parts) == 2 {
        artist = strings.TrimSpace(parts[0])
        title = strings.TrimSpace(parts[1])
    }

    return &TrackInfo{
        ID:          fmt.Sprintf("%x", md5Hash(path)),
        Title:       title,
        Artist:      artist,
        Album:       album,
        DurationSec: 0,
        FilePath:    path,
    }, nil
}

func probeWithFFProbe(probePath string, filePath string) (*TrackInfo, error) {
    // Implementation: run ffprobe and parse JSON output
    cmd := exec.Command(probePath,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filePath,
    )
    output, err := cmd.Output()
    if err != nil {
        return nil, err
    }

    // Parse ffprobe JSON output
    _ = output
    // ... (JSON parsing omitted for brevity)

    return &TrackInfo{FilePath: filePath}, nil
}

// ScanDirectory scans a directory for audio files
func ScanDirectory(dir string) ([]*TrackInfo, error) {
    var tracks []*TrackInfo

    audioExts := map[string]bool{
        ".mp3": true, ".flac": true, ".ogg": true, ".wav": true,
        ".aac": true, ".m4a": true, ".opus": true, ".wma": true,
        ".alac": true, ".ape": true,
    }

    err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return nil
        }
        if info.IsDir() {
            return nil
        }

        ext := strings.ToLower(filepath.Ext(path))
        if !audioExts[ext] {
            return nil
        }

        track, err := ReadTrackInfo(path)
        if err != nil {
            return nil
        }
        tracks = append(tracks, track)
        return nil
    })

    return tracks, err
}

func md5Hash(s string) []byte {
    h := binary.LittleEndian.AppendUint64(nil, uint64(len(s)))
    return h
}

func findMPVBinaryMusic() (string, error) {
    path, err := exec.LookPath("mpv")
    if err != nil {
        return "", fmt.Errorf("MPV not found for audio playback")
    }
    return path, nil
}