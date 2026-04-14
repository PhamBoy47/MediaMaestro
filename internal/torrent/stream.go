package torrent

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// StartStreamServer starts the HTTP streaming server
func (e *Engine) StartStreamServer(port int, eventCB func(string, interface{})) {
	e.streamPort = port
	mux := http.NewServeMux()
	mux.HandleFunc("/stream/", e.handleStream)

	log.Printf("Torrent streaming server starting on port %d", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
	if err != nil {
		log.Printf("Stream server failed: %v", err)
	}
}

// handleStream serves torrent files over HTTP
// URL format: /stream/{infoHash}/{fileIndex}
func (e *Engine) handleStream(w http.ResponseWriter, r *http.Request) {
	// Simple CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")

	if r.Method == "OPTIONS" {
		return
	}

	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/stream/"), "/")
	if len(pathParts) < 2 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	infoHash := pathParts[0]
	fileIndex, err := strconv.Atoi(pathParts[1])
	if err != nil {
		http.Error(w, "Invalid file index", http.StatusBadRequest)
		return
	}

	e.mu.RLock()
	handle, ok := e.torrents[infoHash]
	e.mu.RUnlock()

	if !ok {
		http.Error(w, "Torrent not found", http.StatusNotFound)
		return
	}

	t := handle.Torrent
	if t.Info() == nil {
		http.Error(w, "Metadata not ready", http.StatusServiceUnavailable)
		return
	}

	if fileIndex >= len(t.Files()) {
		http.Error(w, "File index out of bounds", http.StatusBadRequest)
		return
	}

	file := t.Files()[fileIndex]
	
	// Create a reader for the file
	// We use the NewReader which handles pieces automatically
	reader := file.NewReader()
	defer reader.Close()

	// Set headers
	w.Header().Set("Content-Type", "video/mp4") // Defaulting to mp4 for player compatibility
	w.Header().Set("Accept-Ranges", "bytes")
	
	http.ServeContent(w, r, file.DisplayPath(), time.Now(), reader)
}