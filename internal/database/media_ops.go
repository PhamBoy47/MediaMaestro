package database

import (
	"database/sql"
	"strings"
)

func (d *DB) GetMediaItems(mediaType string, search string) ([]MediaItem, error) {
	query := `SELECT id, title, media_type, file_path, cover_path, metadata, play_count, last_played, created_at, updated_at 
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
			&item.Metadata, &item.PlayCount, &lastPlayed, &item.CreatedAt, &item.UpdatedAt,
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
	query := `INSERT INTO media_items (id, title, media_type, file_path, cover_path, metadata)
	          VALUES (?, ?, ?, ?, ?, ?)
	          ON CONFLICT(file_path) DO UPDATE SET
	          title=excluded.title, cover_path=excluded.cover_path, metadata=excluded.metadata, updated_at=datetime('now')`
	
	_, err := d.db.Exec(query, item.ID, item.Title, item.MediaType, item.FilePath, item.CoverPath, item.Metadata)
	return err
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

	// For size, we could SUM file sizes if we stored them, 
	// but for now let's just use dummy or skip.
	stats.TotalSize = "0 GB"
	
	return stats, nil
}
