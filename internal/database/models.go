package database

import "time"

type MediaItem struct {
	ID         string     `json:"id"`
	Title      string     `json:"title"`
	MediaType  string     `json:"media_type"` // 'video' or 'audio'
	FilePath   string     `json:"file_path"`
	CoverPath  string     `json:"cover_path"`
	Metadata   string     `json:"metadata"` // JSON string
	FileSize   int64      `json:"file_size"`
	Duration   float64    `json:"duration"`
	Artist     string     `json:"artist"`
	PlayCount  int        `json:"play_count"`
	LastPlayed *time.Time `json:"last_played"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type Library struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	MediaType string    `json:"media_type"`
	AutoScan  bool      `json:"auto_scan"`
	CreatedAt time.Time `json:"created_at"`
}

type WatchProgress struct {
	ID        string    `json:"id"`
	MediaPath string    `json:"media_path"`
	Position  float64   `json:"position"`
	Duration  float64   `json:"duration"`
	Completed bool      `json:"completed"`
	UpdatedAt time.Time `json:"updated_at"`
}
