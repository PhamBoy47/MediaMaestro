package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

func (d *DB) GetMediaItems(mediaType string, search string) ([]MediaItem, error) {
	query := `SELECT id, title, media_type, file_path, cover_path, metadata,
	          COALESCE(file_size,0), COALESCE(duration,0), COALESCE(artist,''),
	          play_count, last_played, created_at, updated_at 
	          FROM media_items`
	
	var args []interface{}
	var where []string

	if mediaType != "" && mediaType != "all" {
		where = append(where, "media_type = ?")
		args = append(args, mediaType)
	}

	if search != "" {
		where = append(where, "title LIKE ?")
		args = append(args, "%"+search+"%")
	}

	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}

	query += " ORDER BY title ASC"

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []MediaItem
	for rows.Next() {
		var item MediaItem
		var lastPlayed sql.NullTime
		err := rows.Scan(
			&item.ID, &item.Title, &item.MediaType, &item.FilePath, &item.CoverPath,
			&item.Metadata, &item.FileSize, &item.Duration, &item.Artist,
			&item.PlayCount, &lastPlayed, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if lastPlayed.Valid {
			item.LastPlayed = &lastPlayed.Time
		}
		items = append(items, item)
	}

	return items, nil
}

func (d *DB) SaveMediaItem(item MediaItem) error {
	query := `INSERT INTO media_items (id, title, media_type, file_path, cover_path, metadata, file_size, duration, artist)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	          ON CONFLICT(file_path) DO UPDATE SET
	          title=excluded.title, cover_path=excluded.cover_path, metadata=excluded.metadata,
	          file_size=excluded.file_size, duration=excluded.duration, artist=excluded.artist,
	          updated_at=datetime('now')`
	
	_, err := d.db.Exec(query, item.ID, item.Title, item.MediaType, item.FilePath, item.CoverPath, item.Metadata, item.FileSize, item.Duration, item.Artist)
	return err
}

// GetRecentlyPlayed returns the most recently played media items
func (d *DB) GetRecentlyPlayed(limit int) ([]MediaItem, error) {
	query := `SELECT m.id, m.title, m.media_type, m.file_path, m.cover_path, m.metadata,
	          COALESCE(m.file_size,0), COALESCE(m.duration,0), COALESCE(m.artist,''),
	          m.play_count, m.last_played, m.created_at, m.updated_at
	          FROM media_items m
	          INNER JOIN watch_progress w ON w.media_path = m.file_path
	          WHERE m.last_played IS NOT NULL
	          ORDER BY m.last_played DESC
	          LIMIT ?`

	rows, err := d.db.Query(query, limit)
	if err != nil {
		// Fallback: try without join in case watch_progress is empty
		query = `SELECT id, title, media_type, file_path, cover_path, metadata,
		         COALESCE(file_size,0), COALESCE(duration,0), COALESCE(artist,''),
		         play_count, last_played, created_at, updated_at
		         FROM media_items
		         WHERE last_played IS NOT NULL
		         ORDER BY last_played DESC
		         LIMIT ?`
		rows, err = d.db.Query(query, limit)
		if err != nil {
			return nil, err
		}
	}
	defer rows.Close()

	var items []MediaItem
	for rows.Next() {
		var item MediaItem
		var lastPlayed sql.NullTime
		err := rows.Scan(
			&item.ID, &item.Title, &item.MediaType, &item.FilePath, &item.CoverPath,
			&item.Metadata, &item.FileSize, &item.Duration, &item.Artist,
			&item.PlayCount, &lastPlayed, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			continue
		}
		if lastPlayed.Valid {
			item.LastPlayed = &lastPlayed.Time
		}
		items = append(items, item)
	}

	return items, nil
}

// IncrementPlayCount bumps play_count and sets last_played for a file
func (d *DB) IncrementPlayCount(filePath string) error {
	now := time.Now().Format("2006-01-02T15:04:05Z")
	_, err := d.db.Exec(
		`UPDATE media_items SET play_count = play_count + 1, last_played = ?, updated_at = datetime('now') WHERE file_path = ?`,
		now, filePath,
	)
	return err
}

// SaveWatchProgress upserts the playback position for a media file
func (d *DB) SaveWatchProgress(mediaPath string, position float64, duration float64) error {
	completed := false
	if duration > 0 && position/duration > 0.9 {
		completed = true
	}
	
	query := `INSERT INTO watch_progress (id, media_path, position, duration, completed)
	          VALUES (?, ?, ?, ?, ?)
	          ON CONFLICT(media_path) DO UPDATE SET
	          position=excluded.position, duration=excluded.duration,
	          completed=excluded.completed, updated_at=datetime('now')`
	
	id := fmt.Sprintf("wp_%s", mediaPath)
	_, err := d.db.Exec(query, id, mediaPath, position, duration, completed)
	return err
}

// GetWatchProgress returns the saved playback position for a media file
func (d *DB) GetWatchProgress(mediaPath string) (*WatchProgress, error) {
	var wp WatchProgress
	err := d.db.QueryRow(
		`SELECT id, media_path, position, duration, completed, updated_at FROM watch_progress WHERE media_path = ?`,
		mediaPath,
	).Scan(&wp.ID, &wp.MediaPath, &wp.Position, &wp.Duration, &wp.Completed, &wp.UpdatedAt)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &wp, nil
}

// GetWatchProgressBatch returns progress for multiple media paths
func (d *DB) GetWatchProgressBatch(mediaPaths []string) (map[string]*WatchProgress, error) {
	result := make(map[string]*WatchProgress)
	if len(mediaPaths) == 0 {
		return result, nil
	}

	placeholders := make([]string, len(mediaPaths))
	args := make([]interface{}, len(mediaPaths))
	for i, p := range mediaPaths {
		placeholders[i] = "?"
		args[i] = p
	}

	query := fmt.Sprintf(
		`SELECT id, media_path, position, duration, completed, updated_at FROM watch_progress WHERE media_path IN (%s)`,
		strings.Join(placeholders, ","),
	)

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var wp WatchProgress
		if err := rows.Scan(&wp.ID, &wp.MediaPath, &wp.Position, &wp.Duration, &wp.Completed, &wp.UpdatedAt); err != nil {
			continue
		}
		result[wp.MediaPath] = &wp
	}

	return result, nil
}

type GlobalStats struct {
	TotalFiles int    `json:"total_files"`
	Videos     int    `json:"videos"`
	Audio      int    `json:"audio"`
	TotalSize  string `json:"total_size"`
}

func (d *DB) GetStats() (GlobalStats, error) {
	var stats GlobalStats
	
	err := d.db.QueryRow("SELECT COUNT(*) FROM media_items").Scan(&stats.TotalFiles)
	if err != nil {
		return stats, err
	}

	err = d.db.QueryRow("SELECT COUNT(*) FROM media_items WHERE media_type = 'video'").Scan(&stats.Videos)
	if err != nil {
		return stats, err
	}

	err = d.db.QueryRow("SELECT COUNT(*) FROM media_items WHERE media_type = 'audio'").Scan(&stats.Audio)
	if err != nil {
		return stats, err
	}

	// Sum real file sizes
	var totalBytes sql.NullInt64
	err = d.db.QueryRow("SELECT SUM(file_size) FROM media_items").Scan(&totalBytes)
	if err != nil || !totalBytes.Valid {
		stats.TotalSize = "0 B"
	} else {
		stats.TotalSize = formatFileSize(totalBytes.Int64)
	}
	
	return stats, nil
}

func formatFileSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
		TB = GB * 1024
	)
	switch {
	case bytes >= TB:
		return fmt.Sprintf("%.1f TB", float64(bytes)/float64(TB))
	case bytes >= GB:
		return fmt.Sprintf("%.1f GB", float64(bytes)/float64(GB))
	case bytes >= MB:
		return fmt.Sprintf("%.1f MB", float64(bytes)/float64(MB))
	case bytes >= KB:
		return fmt.Sprintf("%.1f KB", float64(bytes)/float64(KB))
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}
