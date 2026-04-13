package torrent

import (
    "context"
    "fmt"
    "net/http"
    "path/filepath"
    "sync"
    "time"

    "github.com/anacrolix/torrent"
    "github.com/anacrolix/torrent/metainfo"
)

type Engine struct {
    client       *torrent.Client
    dataDir      string
    listenPort   int
    torrents     map[string]*torrentHandle
    mu           sync.RWMutex
    streamPort   int
    eventCB      func(string, interface{})
}

type torrentHandle struct {
    Torrent    *torrent.Torrent
    InfoHash   string
    Name       string
    Files      []FileInfo
    StreamURL  string
}

type FileInfo struct {
    Path      string
    Length    int64
    Index     int
    IsVideo   bool
}

type TorrentInfo struct {
    InfoHash   string     `json:"infoHash"`
    Name       string     `json:"name"`
    TotalSize  int64      `json:"totalSize"`
    Files      []FileInfo `json:"files"`
    StreamURL  string     `json:"streamUrl"`
    State      string     `json:"state"`
}

type TorrentStatus struct {
    InfoHash    string  `json:"infoHash"`
    BytesWritten int64  `json:"bytesWritten"`
    BytesRead   int64   `json:"bytesRead"`
    Peers       int     `json:"peers"`
    Speed       float64 `json:"speed"` // bytes/sec
    Progress    float64 `json:"progress"` // 0.0 - 1.0
    State       string  `json:"state"`
}

func NewEngine(dataDir string, listenPort int) (*Engine, error) {
    config := torrent.NewDefaultClientConfig()
    config.DataDir = dataDir
    config.ListenPort = listenPort
    config.NoUpload = false
    config.Seed = true
    config.EstablishedConnsPerTorrent = 40

    client, err := torrent.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create torrent client: %w", err)
    }

    return &Engine{
        client:     client,
        dataDir:    dataDir,
        listenPort: listenPort,
        torrents:   make(map[string]*torrentHandle),
    }, nil
}

func (e *Engine) SetEventCallback(cb func(string, interface{})) {
    e.eventCB = cb
}

func (e *Engine) emit(event string, data interface{}) {
    if e.eventCB != nil {
        e.eventCB(event, data)
    }
}

// AddMagnet adds a magnet URI and waits for metadata
func (e *Engine) AddMagnet(magnetURI string) (*TorrentInfo, error) {
    t, err := e.client.AddMagnet(magnetURI)
    if err != nil {
        return nil, fmt.Errorf("failed to add magnet: %w", err)
    }

    // Wait for metadata (name, files)
    select {
    case <-t.GotInfo():
    case <-time.After(60 * time.Second):
        t.Drop()
        return nil, fmt.Errorf("timed out waiting for torrent metadata")
    }

    info := t.Info()
    hash := t.InfoHash().HexString()

    files := make([]FileInfo, len(info.Files))
    videoExts := map[string]bool{
        ".mkv": true, ".mp4": true, ".avi": true, ".webm": true,
        ".hevc": true, ".flv": true, ".wmv": true, ".mov": true,
        ".ogm": true, ".m4v": true, ".ts": true,
    }

    for i, f := range info.Files {
        path := f.Path
        ext := strings.ToLower(filepath.Ext(path))
        files[i] = FileInfo{
            Path:    path,
            Length:  f.Length,
            Index:   i,
            IsVideo: videoExts[ext],
        }
    }

    handle := &torrentHandle{
        Torrent:  t,
        InfoHash: hash,
        Name:     info.Name,
        Files:    files,
    }

    e.mu.Lock()
    e.torrents[hash] = handle
    e.mu.Unlock()

    // Start downloading all files
    t.DownloadAll()

    e.emit("added", hash)

    return &TorrentInfo{
        InfoHash:  hash,
        Name:      info.Name,
        TotalSize: info.TotalLength(),
        Files:     files,
        StreamURL: fmt.Sprintf("http://localhost:%d/stream/%s/0", e.streamPort, hash),
        State:     "downloading",
    }, nil
}

// AddFile adds a .torrent file
func (e *Engine) AddFile(torrentPath string) (*TorrentInfo, error) {
    meta, err := metainfo.LoadFromFile(torrentPath)
    if err != nil {
        return nil, fmt.Errorf("failed to load torrent file: %w", err)
    }

    t, err := e.client.AddTorrent(meta)
    if err != nil {
        return nil, fmt.Errorf("failed to add torrent: %w", err)
    }

    select {
    case <-t.GotInfo():
    case <-time.After(60 * time.Second):
        t.Drop()
        return nil, fmt.Errorf("timed out waiting for metadata")
    }

    info := t.Info()
    hash := t.InfoHash().HexString()

    t.DownloadAll()

    e.mu.Lock()
    e.torrents[hash] = &torrentHandle{
        Torrent:  t,
        InfoHash: hash,
        Name:     info.Name,
    }
    e.mu.Unlock()

    return e.GetTorrentInfo(hash)
}

// GetStreamURL returns the HTTP URL for streaming a specific file
func (e *Engine) GetStreamURL(infoHash string, fileIndex int) string {
    return fmt.Sprintf("http://localhost:%d/stream/%s/%d", e.streamPort, infoHash, fileIndex)
}

// GetTorrentInfo returns info about a torrent
func (e *Engine) GetTorrentInfo(infoHash string) (*TorrentInfo, error) {
    e.mu.RLock()
    handle, ok := e.torrents[infoHash]
    e.mu.RUnlock()

    if !ok {
        return nil, fmt.Errorf("torrent not found: %s", infoHash)
    }

    t := handle.Torrent
    info := t.Info()

    return &TorrentInfo{
        InfoHash:  infoHash,
        Name:      info.Name,
        TotalSize: info.TotalLength(),
        StreamURL: e.GetStreamURL(infoHash, 0),
        State:     "downloading",
    }, nil
}

// GetStatus returns real-time download status
func (e *Engine) GetStatus(infoHash string) (*TorrentStatus, error) {
    e.mu.RLock()
    handle, ok := e.torrents[infoHash]
    e.mu.RUnlock()

    if !ok {
        return nil, fmt.Errorf("torrent not found: %s", infoHash)
    }

    t := handle.Torrent
    stats := t.Stats()

    totalBytes := t.Length()
    completedBytes := t.BytesCompleted()
    progress := float64(0)
    if totalBytes > 0 {
        progress = float64(completedBytes) / float64(totalBytes)
    }

    return &TorrentStatus{
        InfoHash:    infoHash,
        BytesWritten: stats.BytesWritten.Int64(),
        BytesRead:   stats.BytesRead.Int64(),
        Peers:       stats.ConnectedPeers,
        Speed:       float64(stats.BytesRead.Int64()), // Simplified; real impl uses rate calc
        Progress:    progress,
        State:       "downloading",
    }, nil
}

// Remove removes a torrent
func (e *Engine) Remove(infoHash string) error {
    e.mu.Lock()
    defer e.mu.Unlock()

    handle, ok := e.torrents[infoHash]
    if !ok {
        return fmt.Errorf("torrent not found: %s", infoHash)
    }

    handle.Torrent.Drop()
    delete(e.torrents, infoHash)
    return nil
}

// List returns all active torrents
func (e *Engine) List() []*TorrentInfo {
    e.mu.RLock()
    defer e.mu.RUnlock()

    result := make([]*TorrentInfo, 0, len(e.torrents))
    for hash, handle := range e.torrents {
        info := handle.Torrent.Info()
        result = append(result, &TorrentInfo{
            InfoHash: hash,
            Name:     info.Name,
            TotalSize: info.TotalLength(),
            StreamURL: e.GetStreamURL(hash, 0),
            State:     "downloading",
        })
    }
    return result
}

// Close shuts down the torrent engine
func (e *Engine) Close() {
    e.client.Close()
}

// Need to import strings
import "strings"