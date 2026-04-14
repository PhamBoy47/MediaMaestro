package mpv

import (
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "sync"
    "time"
)

// Manager handles the full MPV lifecycle: launch, IPC, shutdown.
// This mirrors Seanime's MPV management approach.
type Manager struct {
    configDir  string
    mpvPath    string
    ipcClient  *IPCClient
    process    *exec.Cmd
    socketPath string

    // State
    playing     bool
    paused      bool
    currentFile string
    volume      float64

    // Callback for forwarding events to the frontend
    eventCallback func(eventType string, data interface{})
    mu            sync.RWMutex
}

// NewManager creates a new MPV manager
func NewManager(configDir string) *Manager {
    var socketPath string
    if runtime.GOOS == "windows" {
        socketPath = `\\.\pipe\media-maestro-mpv`
    } else {
        socketPath = filepath.Join(configDir, "mpv.sock")
        // Clean up stale socket
        os.Remove(socketPath)
    }

    return &Manager{
        configDir:  configDir,
        socketPath: socketPath,
        volume:     100,
    }
}

// SetEventCallback sets the callback for forwarding MPV events to the frontend
func (m *Manager) SetEventCallback(cb func(string, interface{})) {
    m.eventCallback = cb
}

// emit sends an event to the frontend via the callback
func (m *Manager) emit(eventType string, data interface{}) {
    if m.eventCallback != nil {
        m.eventCallback(eventType, data)
    }
}

// Launch starts the MPV process with the Seanime-compatible configuration
func (m *Manager) Launch(windowHandle uintptr) error {
    mpvPath, err := findMPVBinary()
    if err != nil {
        return fmt.Errorf("MPV not found: %w", err)
    }
    m.mpvPath = mpvPath

    args := []string{
        // ── IPC Configuration (Seanime's approach) ──
        "--idle=yes",
        "--no-terminal",
        fmt.Sprintf("--input-ipc-server=%s", m.socketPath),

        // ── Video Output ──
        // If we have a window handle, render INTO our window
        // Otherwise, MPV opens its own window
        "--vo=gpu",
        "--gpu-api=opengl",
        "--hwdec=auto",

        // ── Cache / Streaming (critical for torrent playback) ──
        "--cache=yes",
        "--demuxer-max-bytes=150MiB",
        "--demuxer-max-back-bytes=75MiB",
        "--demuxer-readahead-secs=20",
        "--cache-secs=30",
        "--cache-pause=yes",
        "--cache-pause-wait=5",
        "--cache-pause-initial=yes",

        // ── Subtitle Configuration ──
        "--sub-auto=fuzzy",
        "--sub-file-paths=" + filepath.Join(m.configDir, "subtitles"),
        "--sub-codepage=cp1256:utf-8", // Auto-detect encoding
        "--sub-font=Inter",
        "--sub-font-size=42",
        "--sub-border-size=3",
        "--sub-shadow-offset=1",

        // ── Disable MPV's built-in OSC (we build our own) ──
        "--osc=no",
        "--osd-level=0",
        "--no-osd-bar",

        // ── Keep open on playback end ──
        "--keep-open=yes",
        "--keep-open-pause=yes",

        // ── Force seekable for streams ──
        "--force-seekable=yes",

        // ── Screenshot settings ──
        fmt.Sprintf("--screenshot-directory=%s", filepath.Join(m.configDir, "screenshots")),
        "--screenshot-template=%F_%P_%n",
        "--screenshot-format=png",
        "--screenshot-png-compression=5",

        // ── Audio ──
        "--alang=en,eng,ja,jpn,japanese",
        "--audio-file-auto=fuzzy",

        // ── Subtitle language priority ──
        "--slang=en,eng,ja,jpn,japanese",

        // ── Performance ──
        "--video-sync=audio",
        "--interpolation=no",
        "--vo-latency-hacks=yes",
    }

    // If we have a window handle (from Wails), embed MPV
    if windowHandle != 0 {
        args = append(args, fmt.Sprintf("--wid=%d", windowHandle))
    }

    m.process = exec.Command(m.mpvPath, args...)

    // Redirect stderr for debugging
    m.process.Stderr = os.Stderr

    if err := m.process.Start(); err != nil {
        return fmt.Errorf("failed to start MPV: %w", err)
    }

    // Connect to IPC
    m.ipcClient = NewIPCClient(m.socketPath)
    m.ipcClient.OnEvent("end-file", func(data interface{}) {
        m.mu.Lock()
        m.playing = false
        m.currentFile = ""
        m.mu.Unlock()
        m.emit("ended", nil)
    })

    m.ipcClient.OnEvent("file-loaded", func(data interface{}) {
        m.mu.Lock()
        m.playing = true
        m.mu.Unlock()
        m.emit("file-loaded", nil)
    })

    // Reconnect loop
    for i := 0; i < 50; i++ {
        err := m.ipcClient.Connect()
        if err == nil {
            m.registerPropertyObservers()
            m.emit("ready", nil)
            return nil
        }
        time.Sleep(100 * time.Millisecond)
    }

    return fmt.Errorf("failed to connect to MPV IPC after 5 seconds")
}

// registerPropertyObservers sets up real-time property forwarding to the frontend.
// This is exactly how Seanime tracks playback state.
func (m *Manager) registerPropertyObservers() {
    c := m.ipcClient

    c.ObserveProperty("time-pos", func(data interface{}) {
        if v, ok := data.(float64); ok {
            m.emit("time-pos", v)
        }
    })

    c.ObserveProperty("duration", func(data interface{}) {
        if v, ok := data.(float64); ok {
            m.emit("duration", v)
        }
    })

    c.ObserveProperty("pause", func(data interface{}) {
        if v, ok := data.(bool); ok {
            m.mu.Lock()
            m.paused = v
            m.mu.Unlock()
            m.emit("pause", v)
        }
    })

    c.ObserveProperty("volume", func(data interface{}) {
        if v, ok := data.(float64); ok {
            m.mu.Lock()
            m.volume = v
            m.mu.Unlock()
            m.emit("volume", v)
        }
    })

    c.ObserveProperty("track-list", func(data interface{}) {
        m.emit("track-list", data)
    })

    c.ObserveProperty("demuxer-cache-state", func(data interface{}) {
        m.emit("buffer", data)
    })

    c.ObserveProperty("eof-reached", func(data interface{}) {
        if v, ok := data.(bool); ok && v {
            m.emit("ended", nil)
        }
    })

    c.ObserveProperty("paused-for-cache", func(data interface{}) {
        if v, ok := data.(bool); ok {
            m.emit("cache-pause", v)
        }
    })

    // Set initial volume
    c.SetProperty("volume", m.volume)
}

// ══════════════════════════════════════════════════════════
// Playback Commands
// ══════════════════════════════════════════════════════════

func (m *Manager) PlayFile(path string) error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        if err := m.Launch(0); err != nil {
            return err
        }
    }
    _, err := m.ipcClient.SendCommand("loadfile", path)
    if err != nil {
        return err
    }
    m.mu.Lock()
    m.currentFile = path
    m.playing = true
    m.mu.Unlock()
    return nil
}

func (m *Manager) PlayURL(url string, title string) error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        if err := m.Launch(0); err != nil {
            return err
        }
    }
    if title != "" {
        m.ipcClient.SetProperty("force-media-title", title)
    }
    _, err := m.ipcClient.SendCommand("loadfile", url)
    if err != nil {
        return err
    }
    m.mu.Lock()
    m.currentFile = url
    m.playing = true
    m.mu.Unlock()
    return nil
}

func (m *Manager) PlayWithSubs(path string, subPath string) error {
    if err := m.PlayFile(path); err != nil {
        return err
    }
    if subPath != "" {
        return m.AddSubtitle(subPath)
    }
    return nil
}

func (m *Manager) TogglePause() error {
    paused, err := m.GetFloatProperty("pause")
    if err != nil {
        return err
    }
    // paused is 0 or 1 as float
    return m.SetProperty("pause", paused == 0)
}

func (m *Manager) SeekAbsolute(seconds float64) error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return fmt.Errorf("MPV not connected")
    }
    _, err := m.ipcClient.SendCommand("seek", seconds, "absolute")
    return err
}

func (m *Manager) SeekRelative(seconds float64) error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return fmt.Errorf("MPV not connected")
    }
    _, err := m.ipcClient.SendCommand("seek", seconds, "relative")
    return err
}

func (m *Manager) SetVolume(vol float64) error {
    m.mu.Lock()
    m.volume = vol
    m.mu.Unlock()
    return m.SetProperty("volume", vol)
}

func (m *Manager) Stop() error {
    if m.ipcClient != nil && m.ipcClient.IsConnected() {
        _, err := m.ipcClient.SendCommand("stop")
        if err != nil {
            return err
        }
    }
    m.mu.Lock()
    m.playing = false
    m.currentFile = ""
    m.mu.Unlock()
    return nil
}

func (m *Manager) Shutdown() {
    if m.ipcClient != nil {
        m.ipcClient.SendCommand("quit")
        m.ipcClient.Close()
    }
    if m.process != nil && m.process.Process != nil {
        m.process.Process.Kill()
        m.process.Wait()
    }
    os.Remove(m.socketPath)
}

func (m *Manager) ToggleFullscreen() error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return fmt.Errorf("MPV not connected")
    }
    _, err := m.ipcClient.SendCommand("cycle", "fullscreen")
    return err
}

func (m *Manager) AddSubtitle(path string) error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return fmt.Errorf("MPV not connected")
    }
    _, err := m.ipcClient.SendCommand("sub-add", path)
    return err
}


func (m *Manager) Screenshot(filePath string) error {
    return m.SetProperty("screenshot-template", filePath)
}

func (m *Manager) IsPlaying() bool {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return m.playing
}

func (m *Manager) SetProperty(name string, value interface{}) error {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return fmt.Errorf("MPV not connected")
    }
    return m.ipcClient.SetProperty(name, value)
}

func (m *Manager) GetProperty(name string) (interface{}, error) {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return nil, fmt.Errorf("MPV not connected")
    }
    return m.ipcClient.GetProperty(name)
}

func (m *Manager) GetFloatProperty(name string) (float64, error) {
    if m.ipcClient == nil || !m.ipcClient.IsConnected() {
        return 0, fmt.Errorf("MPV not connected")
    }
    return m.ipcClient.GetFloatProperty(name)
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